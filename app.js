(() => {
  const APP = window.CABIN_DRILL_DATA;
  if (!APP) {
    document.body.insertAdjacentHTML('afterbegin', '<div style="padding:12px;background:#fff0f0;color:#a22;font-weight:700">Data file could not be loaded. Make sure app-data.js is in the same folder as index.html.</div>');
    throw new Error('Cabin drill data not loaded.');
  }

  const $ = (id) => document.getElementById(id);
  const form = $('drillForm');
  const aircraftSelect = $('aircraftSelect');
  const crewPosition = $('crewPosition');
  const resultSection = $('resultSection');
  const equipmentDiagramDialog = $('equipmentDiagramDialog');

  const TARGET_EQUIPMENT = ['AED', 'EMK', 'MFAK', 'ISB', 'ESB'];


  // Rev.03 Q&A page overrides (effective 20 Oct 2026).
  // Only days whose Safety source pages changed are overridden here.
  const QNA_OVERRIDES = {
    pages: {
      '2': [1, 2],
      '6': [1, 2, 3, 4, 5],
      '9': [1, 2],
      '23': [1, 2, 3],
      '30': [1, 2]
    },
    topics: {
      '6': 'Safety: Carriage of Person with Medical Condition/Illness · First Aid: First Aid Kits (DFAK, MFAK, EMK)',
      '30': 'Safety: Restraint Kit · First Aid: DRCABD - Defibrillation / Performing Defibrillation'
    }
  };

  let currentAircraftForPreflight = null;
  let preflightPinnedTarget = null;

  const PREFLIGHT_CHECKS = {
    equipment: {
      title: 'Safety & Emergency Equipment',
      lines: [
        'Perform a pre-flight check.',
        'Use the equipment location and quantity shown for the selected aircraft and crew position.'
      ]
    },
    lavatory: {
      title: 'Lavatory pre-flight check',
      lines: [
        'Ensure the lavatory fire-extinguisher pressure gauge needle is in the green zone.',
        'Ensure the lavatory waste-bin flap retracts to the closed position.',
        'Ensure the lavatory smoke detector is not obstructed or tampered with.',
        'Security check: under the sink, waste-bin container, drawers, and amenities compartment.'
      ]
    },
    galley: {
      title: 'Galley pre-flight / security check',
      lines: [
        'Security check all galley stowage, including Standard Unit (S/U), Miscellaneous Unit (M/U), and waste bins.',
        'For service/waste carts in your sector: move the cart back and forth to ensure free movement.',
        'Apply the brake and confirm the cart does not move.',
        'Release the brake and confirm there is no brake seizure.',
        'Tug the cart door to ensure it can be locked and latched.',
        'Tag a defective cart “UNSERVICEABLE”, withdraw it for repair/replacement, and do not use it for passenger service.'
      ]
    }
  };


  const FLIGHT_ROUTES = {
    '230': { origin: 'DMK', destination: 'DEL', salesTarget: 10000 },
    '231': { origin: 'DEL', destination: 'DMK', salesTarget: 8000 },

    '600': { origin: 'DMK', destination: 'NRT', salesTarget: 6400 },
    '602': { origin: 'DMK', destination: 'NRT', salesTarget: 6200 },
    '606': { origin: 'DMK', destination: 'NRT', salesTarget: 19000 },
    '601': { origin: 'NRT', destination: 'DMK', salesTarget: 14600 },
    '603': { origin: 'NRT', destination: 'DMK', salesTarget: 12600 },
    '607': { origin: 'NRT', destination: 'DMK', salesTarget: 12600 },

    '610': { origin: 'DMK', destination: 'KIX', salesTarget: 17000 },
    '612': { origin: 'DMK', destination: 'KIX', salesTarget: 6800 },
    '614': { origin: 'DMK', destination: 'KIX', salesTarget: null },
    '611': { origin: 'KIX', destination: 'DMK', salesTarget: 11000 },
    '613': { origin: 'KIX', destination: 'DMK', salesTarget: 14000 },
    '615': { origin: 'KIX', destination: 'DMK', salesTarget: null },

    '620': { origin: 'DMK', destination: 'CTS', salesTarget: 7500 },
    '621': { origin: 'CTS', destination: 'DMK', salesTarget: 17800 },

    '638': { origin: 'DMK', destination: 'NGO', salesTarget: 4500 },
    '639': { origin: 'NGO', destination: 'DMK', salesTarget: 7100 },

    '864': { origin: 'DMK', destination: 'ALA', salesTarget: 9500 },
    '865': { origin: 'ALA', destination: 'DMK', salesTarget: 4300 }
  };

  function getFlightRoute(flightNumber) {
    const digits = String(flightNumber || '').replace(/\D/g, '');
    return FLIGHT_ROUTES[digits] || null;
  }

  function updateRoutePreview() {
    const route = getFlightRoute($('flightNumber').value);
    $('routePreview').value = route ? `${route.origin} → ${route.destination}` : '';
  }

  const CIQ_DATA = {
    NRT: {
      place: 'Japan',
      sections: [
        {
          label: 'Pax',
          lines: [
            'duty free <200,000 yen, cash 1M, Alc 3b <760ml',
            '200 cig, 10 heated, 50 cigars, 250g tobacco',
            '2 ounces perfume (60 ml)'
          ]
        },
        {
          label: 'Crew',
          lines: [
            'duty free 15,000 yen, no alcohol',
            '50 cig, 15 cigars, 75g tobacco'
          ]
        }
      ]
    },
    NGO: { alias: 'NRT' },
    KIX: { alias: 'NRT' },
    CTS: { alias: 'NRT' },
    SDJ: { alias: 'NRT' },

    DMK: {
      place: 'Thailand',
      sections: [
        {
          label: 'Pax+Crew',
          lines: [
            'duty free 20,000 THB',
            'Alc 1 L',
            '200 cig, 250g cigars/tobacco'
          ]
        }
      ]
    },

    DEL: {
      place: 'India',
      sections: [
        {
          label: 'Pax',
          lines: [
            'Indian: 50,000 INR Others: 15,000 INR',
            'All: Alcoholic liquor or wine: 2L',
            'Cigarettes: 100 nos. or Cigars up to 25 or Tobacco 125 g',
            '1 laptop',
            'Indian abroad >1y: Gold Jewelry: Male-20 gms INR 50,000',
            'Female-40 gms value cap INR 100,000'
          ]
        }
      ]
    },

    ALA: {
      place: 'Kazahkstan',
      sections: [
        {
          label: 'Pax+Crew',
          lines: [
            'duty free goods ≤ EUR 10,000, <50 kg, Alc 3 L',
            '200 cig, 50 cigars, 250g tobacco',
            'perfume reasonable qty',
            'foreign cash > USD 3,000 declare'
          ]
        }
      ]
    }
  };

  function getCiqData(code) {
    const key = String(code || '').trim().toUpperCase();
    const entry = CIQ_DATA[key];
    if (!entry) return null;
    return entry.alias ? CIQ_DATA[entry.alias] : entry;
  }

  function renderCiq(destination) {
    const code = String(destination || '').trim().toUpperCase();
    const data = getCiqData(code);

    $('ciqAirportBadge').textContent = code || '—';

    if (!data) {
      $('ciqTitle').textContent = code ? `CIQ · ${code}` : 'CIQ';
      $('ciqContent').innerHTML = `<p class="ciq-unavailable">No CIQ information saved for ${escapeHtml(code || 'this destination')}.</p>`;
      return;
    }

    $('ciqTitle').textContent = `CIQ · ${data.place}`;

    $('ciqContent').innerHTML = data.sections.map((section) => {
      const heading = section.label
        ? `<div class="ciq-section-label">${escapeHtml(section.label)}</div>`
        : '';

      return `
        <section class="ciq-section">
          ${heading}
          <div class="ciq-lines">
            ${section.lines.map((line) => `<div>${escapeHtml(line)}</div>`).join('')}
          </div>
        </section>`;
    }).join('');
  }


  // Exact locations transcribed from diagram.pdf (Cabin Crew Manual Part I, Appendix D).
  const DIAGRAM_DATA = {
    'HS-XTC': 'standard-12-365',
    'HS-XTE': 'standard-12-365',
    'HS-XTH': 'all-ey-type-ia',
    'HS-XTI': 'all-ey-type-ia-xti',
    'HS-XTN': 'standard-363',
    'HS-XTO': 'complex-type-i',
    'HS-XTQ': 'complex-type-i',
    'HS-XTP': 'all-ey-type-ii'
  };

  const EQUIPMENT_REFERENCE = {
    'standard-12-365': {
      title: 'Standard 12-365',
      image: 'diagram-standard-12-365.webp',
      source: 'Appendix D5-1 · Standard 12-365',
      equipment: {
        AED: [{ location: 'STOWAGE COMPARTMENT NEXT TO DOOR 1L', quantity: 1 }],
        EMK: [{ location: 'OHB 14G', quantity: 1 }],
        MFAK: [
          { location: 'FLIGHT DECK', quantity: 1 },
          { location: 'STOWAGE COMPARTMENT NEXT TO DOOR 1L', quantity: 1 },
          { location: 'STOWAGE BEHIND 33HJK', quantity: 1 },
          { location: 'OHB ROW 35 ABC', quantity: 1 },
          { location: 'OHB 51G', quantity: 1 }
        ],
        ISB: [
          { location: 'STOWAGE BEHIND 33ABC', quantity: 8 },
          { location: 'STOWAGE BEHIND 33HJK', quantity: 8 }
        ],
        ESB: [
          { location: 'STOWAGE BEHIND 33ABC', quantity: 5 },
          { location: 'STOWAGE BEHIND 33HJK', quantity: 5 }
        ]
      }
    },
    'all-ey-type-ia': {
      title: 'All EY Type I-A',
      image: 'diagram-all-ey-type-ia.webp',
      source: 'Appendix D5-2 · All EY Type I-A',
      equipment: {
        AED: [{ location: 'STOWAGE COMPARTMENT NEXT TO D1L', quantity: 1 }],
        EMK: [{ location: 'OHB ROW 12G', quantity: 1 }],
        MFAK: [
          { location: 'FLIGHT DECK', quantity: 1 },
          { location: 'STOWAGE COMPARTMENT NEXT TO D1L', quantity: 1 },
          { location: 'STOWAGE BEHIND 29HK', quantity: 1 },
          { location: 'OHB ROW 30ABC', quantity: 1 },
          { location: 'OHB BEHIND ROW 44G', quantity: 1 }
        ],
        ISB: [
          { location: 'STOWAGE BEHIND 29AC', quantity: 8 },
          { location: 'STOWAGE BEHIND 29HK', quantity: 8 }
        ],
        ESB: [
          { location: 'STOWAGE BEHIND 29AC', quantity: 5 },
          { location: 'STOWAGE BEHIND 29HK', quantity: 5 }
        ]
      }
    },
    'all-ey-type-ia-xti': {
      title: 'All EY Type I-A (XTI)',
      image: 'diagram-all-ey-type-ia-xti.webp',
      source: 'Appendix D5-3 · All EY Type I-A (XTI)',
      equipment: {
        AED: [{ location: 'STOWAGE COMPARTMENT NEXT TO D1L', quantity: 1 }],
        EMK: [{ location: 'OHB BEHIND ROW 12G', quantity: 1 }],
        MFAK: [
          { location: 'FLIGHT DECK', quantity: 1 },
          { location: 'STOWAGE COMPARTMENT NEXT TO D1L', quantity: 1 },
          { location: 'STOWAGE BEHIND 29HK', quantity: 1 },
          { location: 'OHB BEFORE ROW 30ABC', quantity: 1 },
          { location: 'OHB BEHIND ROW 44G', quantity: 1 }
        ],
        ISB: [
          { location: 'STOWAGE BEHIND 29AC', quantity: 8 },
          { location: 'STOWAGE BEHIND 29HK', quantity: 8 }
        ],
        ESB: [
          { location: 'STOWAGE BEHIND 29AC', quantity: 5 },
          { location: 'STOWAGE BEHIND 29HK', quantity: 5 }
        ]
      }
    },
    'standard-363': {
      title: 'Standard 363',
      image: 'diagram-standard-363.webp',
      source: 'Appendix D5-4 · Standard 363',
      equipment: {
        AED: [{ location: 'CLOSET CC 2', quantity: 1 }],
        EMK: [
          { location: 'OHSB ABOVE CC 3', quantity: 1 },
          { location: 'ROW 35 ABC OHSC', quantity: 1 }
        ],
        MFAK: [
          { location: 'FLIGHT DECK', quantity: 1 },
          { location: 'CLOSET CC 2', quantity: 1 },
          { location: 'DOGHOUSE BEFORE CLOSET CC 3', quantity: 1 },
          { location: 'DOGHOUSE BEHIND 33H', quantity: 1 },
          { location: 'ROW 35 HJK OHSC', quantity: 1 },
          { location: 'ROW 51 AC OHSC', quantity: 1 }
        ],
        ISB: [{ location: 'CLOSET CC 3', quantity: 36 }],
        ESB: [
          { location: 'CLOSET CC 1', quantity: 4 },
          { location: 'DOGHOUSE BEHIND 33H', quantity: 4 },
          { location: 'ROW 51 AC OHSC', quantity: 10 },
          { location: 'DOGHOUSE BEHIND 51C', quantity: 2 }
        ]
      }
    },
    'complex-type-i': {
      title: 'Complex Type I',
      image: 'diagram-complex-type-i.webp',
      source: 'Appendix D5-5 · Complex Type I',
      equipment: {
        AED: [{ location: 'OHB ROW 31 HK', quantity: 1 }],
        EMK: [{ location: 'OHB ROW 31 HK', quantity: 1 }],
        MFAK: [
          { location: 'FLIGHT DECK', quantity: 1 },
          { location: 'OHB ROW 11 HK', quantity: 1 },
          { location: 'OHB ROW 31 HK', quantity: 1 },
          { location: 'OHB ROW 62 AC', quantity: 1 },
          { location: 'OHB ROW 62 HK', quantity: 1 }
        ],
        ISB: [{ location: 'OHB ROW 48 HK', quantity: 16 }],
        ESB: [{ location: 'OHB ROW 48 HK', quantity: 10 }]
      }
    },
    'all-ey-type-ii': {
      title: 'All EY Type II',
      image: 'diagram-all-ey-type-ii.webp',
      source: 'Appendix D5-6 · All EY Type II',
      equipment: {
        AED: [{ location: 'STOWAGE S04 & S05', quantity: 1 }],
        EMK: [{ location: 'STOWAGE S04 & S05', quantity: 1 }],
        MFAK: [
          { location: 'DOGHOUSE D-1', quantity: 1 },
          { location: 'OHB ROW 47 AB', quantity: 1 },
          { location: 'OHB ROW 47 JK', quantity: 1 },
          { location: 'OHB ROW 62 AB', quantity: 1 },
          { location: 'OHB ROW 62 JK', quantity: 1 }
        ],
        ISB: [
          { location: 'DOGHOUSE D-7', quantity: 10 },
          { location: 'DOGHOUSE D-8', quantity: 10 }
        ],
        ESB: [
          { location: 'OHB ROW 30 AB (SPARE KIT)', quantity: 2 },
          { location: 'OHB ROW 30 JK (SPARE KIT)', quantity: 2 },
          { location: 'OHB ROW 47 AB (SPARE KIT)', quantity: 2 },
          { location: 'OHB ROW 47 JK (SPARE KIT)', quantity: 2 },
          { location: 'OHB ROW 63 AB (SPARE KIT)', quantity: 2 },
          { location: 'OHB ROW 63 JK (SPARE KIT)', quantity: 2 }
        ]
      }
    }
  };

  const registrationIndex = [];
  APP.drill.aircraft.forEach((aircraft, aircraftIndex) => {
    const registrations = aircraft.ui?.registrations || aircraft.registrations || [];
    registrations.forEach((registration) => {
      registrationIndex.push({
        registration,
        aircraftIndex,
        label: aircraft.ui?.label || aircraft.name
      });
    });
  });

  function formatDateInput(date) {
    const d = String(date.getDate()).padStart(2, '0');
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const y = date.getFullYear();
    return `${d}/${m}/${y}`;
  }

  function normalizeSavedDate(value) {
    const text = String(value || '').trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(text)) {
      const [y, m, d] = text.split('-');
      return `${d}/${m}/${y}`;
    }
    return text;
  }

  function parseDateInput(value) {
    const match = String(value || '').trim().match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    if (!match) return null;

    const day = Number(match[1]);
    const month = Number(match[2]);
    const year = Number(match[3]);

    const date = new Date(year, month - 1, day);
    if (
      date.getFullYear() !== year ||
      date.getMonth() !== month - 1 ||
      date.getDate() !== day
    ) return null;

    return { year, month, day };
  }

  function setDefaultDate() {
    if ($('departureDate').value) return;
    $('departureDate').value = formatDateInput(new Date());
  }

  function normalize24h(value) {
    const digits = String(value || '').replace(/\D/g, '');
    return digits.length <= 4 ? digits.padStart(4, '0') : digits.slice(0, 4);
  }

  function parse24hTime(value) {
    const hhmm = normalize24h(value);
    if (!/^(?:[01]\d|2[0-3])[0-5]\d$/.test(hhmm) && hhmm !== '2400') return null;
    if (hhmm === '2400') return { hour: 0, minute: 0, dayOffset: 1 };
    return {
      hour: Number(hhmm.slice(0, 2)),
      minute: Number(hhmm.slice(2)),
      dayOffset: 0
    };
  }

  function parseLocalDate(dateValue, timeValue) {
    const dateParts = parseDateInput(dateValue);
    const time = parse24hTime(timeValue);
    if (!dateParts || !time) return null;

    return new Date(
      dateParts.year,
      dateParts.month - 1,
      dateParts.day + time.dayOffset,
      time.hour,
      time.minute,
      0,
      0
    );
  }

  function formatTimeOnly(date) {
    return `${String(date.getHours()).padStart(2, '0')}${String(date.getMinutes()).padStart(2, '0')}`;
  }

  function formatDateOnly(date) {
    return new Intl.DateTimeFormat('en-GB', {
      day: '2-digit', month: 'short', year: 'numeric'
    }).format(date);
  }

  function getSelectedAircraft() {
    const selectedRegistration = aircraftSelect.value;
    const entry = registrationIndex.find((item) => item.registration === selectedRegistration);
    if (!entry) throw new Error(`No aircraft data found for ${selectedRegistration || 'the selected aircraft'}.`);
    return { entry, aircraft: APP.drill.aircraft[entry.aircraftIndex] };
  }

  function classifyPreflightArea(label) {
    const text = String(label || '').toUpperCase();
    if (text.includes('LAV')) return 'lavatory';
    if (text.includes('GALLEY')) return 'galley';
    return 'zone';
  }

  function renderSecurityAreas(items) {
    $('securityAreas').innerHTML = items.map((item) => {
      const type = classifyPreflightArea(item);
      return `<li class="preflight-target" tabindex="0"
        data-preflight-type="${type}"
        data-preflight-label="${escapeHtml(item)}">${escapeHtml(item)}</li>`;
    }).join('');
  }

  function renderEquipment(groups) {
    $('equipmentChecklist').innerHTML = groups.map((group) => {
      const items = group.items.map((equipment) => {
        const vital = equipment.vitalEmergency;
        return `
          <div class="equipment-item ${vital ? 'vital' : ''} preflight-target" tabindex="0"
            data-preflight-type="equipment"
            data-preflight-label="${escapeHtml(equipment.code)}"
            data-preflight-location="${escapeHtml(group.location)}"
            data-preflight-quantity="${escapeHtml(equipment.quantity)}">
            <span class="equipment-code">${escapeHtml(equipment.code)}${vital ? '<span class="vital-tag">VITAL</span>' : ''}</span>
            <span class="equipment-qty">×${equipment.quantity}</span>
          </div>`;
      }).join('');
      return `
        <section class="equipment-group">
          <div class="equipment-location">${escapeHtml(group.location)}</div>
          <div class="equipment-items">${items}</div>
        </section>`;
    }).join('');
  }

  function collectFallbackEquipmentLocations(aircraft) {
    const result = Object.fromEntries(TARGET_EQUIPMENT.map((code) => [code, []]));
    const locationMaps = Object.fromEntries(TARGET_EQUIPMENT.map((code) => [code, new Map()]));

    Object.values(aircraft.positions || {}).forEach((positionData) => {
      (positionData.equipmentChecklist || []).forEach((group) => {
        (group.items || []).forEach((equipment) => {
          if (!TARGET_EQUIPMENT.includes(equipment.code)) return;
          const map = locationMaps[equipment.code];
          map.set(group.location, (map.get(group.location) || 0) + Number(equipment.quantity || 0));
        });
      });
    });

    TARGET_EQUIPMENT.forEach((code) => {
      result[code] = [...locationMaps[code].entries()].map(([location, quantity]) => ({ location, quantity }));
    });
    return result;
  }

  function renderKeyEquipment(aircraft, registration) {
    const referenceKey = DIAGRAM_DATA[registration];
    const reference = referenceKey ? EQUIPMENT_REFERENCE[referenceKey] : null;
    const equipment = reference?.equipment || collectFallbackEquipmentLocations(aircraft);

    $('keyEquipmentLocations').innerHTML = TARGET_EQUIPMENT.map((code) => {
      const locations = equipment[code] || [];
      const rows = locations.length
        ? locations.map(({ location, quantity }) => `
            <li class="preflight-target" tabindex="0"
              data-preflight-type="equipment"
              data-preflight-label="${escapeHtml(code)}"
              data-preflight-location="${escapeHtml(location)}"
              data-preflight-quantity="${escapeHtml(quantity)}">
              <span>${escapeHtml(location)}</span>
              <strong>×${escapeHtml(quantity)}</strong>
            </li>`).join('')
        : '<li class="no-location">Not shown in the available source.</li>';

      return `
        <article class="key-equipment-item">
          <div class="key-equipment-code">${code}</div>
          <ul>${rows}</ul>
        </article>`;
    }).join('');

    $('equipmentLocationSource').textContent = reference
      ? `Source: ${reference.source}`
      : 'Source: Emergency Drill Checklist data. The supplied diagram PDF does not include All EY Type I-B.';

    const title = reference?.title || (aircraft.ui?.label || aircraft.name);
    $('equipmentDiagramTitle').textContent = title;

    if (reference?.image) {
      $('equipmentDiagramImage').src = reference.image;
      $('equipmentDiagramImage').alt = `${title} safety and emergency equipment location diagram`;
      $('equipmentDiagramDialogImage').src = reference.image;
      $('equipmentDiagramDialogImage').alt = `${title} safety and emergency equipment location diagram enlarged`;
      $('equipmentDiagramStage').classList.remove('hidden');
      $('equipmentDiagramUnavailable').classList.add('hidden');
      $('enlargeEquipmentDiagram').classList.remove('hidden');
      $('equipmentDiagramCaption').textContent = `Source: ${reference.source}`;
    } else {
      $('equipmentDiagramImage').removeAttribute('src');
      $('equipmentDiagramDialogImage').removeAttribute('src');
      $('equipmentDiagramStage').classList.add('hidden');
      $('equipmentDiagramUnavailable').classList.remove('hidden');
      $('equipmentDiagramUnavailable').textContent = 'No All EY Type I-B aircraft diagram is included in the supplied diagram.pdf.';
      $('enlargeEquipmentDiagram').classList.add('hidden');
      $('equipmentDiagramCaption').textContent = '';
    }
  }

  function splitQnaTopic(topic) {
    const text = String(topic || '');
    const separator = ' · First Aid: ';
    const index = text.indexOf(separator);
    if (index === -1) {
      return {
        safety: text.replace(/^Safety:\s*/i, '') || '—',
        firstAid: '—'
      };
    }
    return {
      safety: text.slice(0, index).replace(/^Safety:\s*/i, '') || '—',
      firstAid: text.slice(index + separator.length) || '—'
    };
  }

  function renderQna(day) {
    const key = String(day);
    const pageNumbers = QNA_OVERRIDES.pages[key] || APP.qna.pages[key] || APP.qna.pages[day] || [];
    const topic = QNA_OVERRIDES.topics[key] || APP.qna.topics[key] || APP.qna.topics[day] || '';
    const topics = splitQnaTopic(topic);

    $('qnaTitleDay').textContent = String(day).padStart(2, '0');
    $('qnaSafetyTopic').textContent = topics.safety;
    $('qnaFirstAidTopic').textContent = topics.firstAid;
    $('qnaPages').innerHTML = pageNumbers.map((_, index) => {
      const path = `day-${String(day).padStart(2, '0')}-page-${index + 1}.webp`;
      return `
        <figure class="qna-page">
          <img loading="lazy" src="${path}" alt="Q&A Day ${day}, page ${index + 1}" />
          <figcaption>Day ${String(day).padStart(2, '0')} · ${index + 1} / ${pageNumbers.length}</figcaption>
        </figure>`;
    }).join('');
  }

  function escapeHtml(value) {
    return String(value ?? '')
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#039;');
  }

  function saveForm() {
    localStorage.setItem('cabinDrillFormV3', JSON.stringify({
      flightNumber: $('flightNumber').value,
      aircraftSelect: aircraftSelect.value,
      crewPosition: crewPosition.value,
      departureDate: $('departureDate').value,
      departureTime: $('departureTime').value,
      arrivalTime: $('arrivalTime').value,
      blockHours: $('blockHours').value,
      paxCount: $('paxCount').value,
      pbm: $('pbm').value
    }));
  }

  function restoreForm() {
    try {
      const saved = JSON.parse(localStorage.getItem('cabinDrillFormV3') || localStorage.getItem('cabinDrillFormV2') || '{}');
      if (saved.flightNumber) $('flightNumber').value = String(saved.flightNumber).replace(/\D/g, '');
      if (saved.aircraftSelect !== undefined) {
        const savedValue = String(saved.aircraftSelect);
        const byRegistration = registrationIndex.find((item) => item.registration === savedValue);
        const byOldIndex = /^\d+$/.test(savedValue) ? registrationIndex[Number(savedValue)] : null;
        const restored = byRegistration?.registration || byOldIndex?.registration;
        if (restored) aircraftSelect.value = restored;
      }
      if (/^[1-8]$/.test(saved.crewPosition || '')) crewPosition.value = saved.crewPosition;
      if (saved.departureDate) $('departureDate').value = normalizeSavedDate(saved.departureDate);
      if (saved.departureTime) $('departureTime').value = saved.departureTime;
      if (saved.arrivalTime) $('arrivalTime').value = saved.arrivalTime;
      if (saved.blockHours !== undefined) $('blockHours').value = saved.blockHours;
      if (saved.paxCount !== undefined) $('paxCount').value = String(saved.paxCount).replace(/\D/g, '').slice(0, 3);
      if (saved.pbm !== undefined) $('pbm').value = saved.pbm;
      updateRoutePreview();
    } catch (_) {}
  }

  function renderResult() {
    if (!form.reportValidity()) return;

    const { entry, aircraft } = getSelectedAircraft();
    const positionNumber = crewPosition.value.trim();
    if (!/^[1-8]$/.test(positionNumber)) {
      crewPosition.setCustomValidity('Enter a crew position from 1 to 8.');
      crewPosition.reportValidity();
      crewPosition.setCustomValidity('');
      return;
    }

    const position = `P${positionNumber}`;
    const positionData = aircraft.positions[position];
    if (!positionData) {
      alert(`No drill data found for ${position}.`);
      return;
    }

    const departure = parseLocalDate($('departureDate').value, $('departureTime').value);
    const arrival = parseLocalDate($('departureDate').value, $('arrivalTime').value);
    if (!departure || !arrival) {
      alert('Check the departure date (DD/MM/YYYY) and enter departure/arrival times in 24-hour HHMM format, for example 0030 or 1745.');
      return;
    }

    const reporting = new Date(departure.getTime() - 75 * 60 * 1000);
    if (arrival < departure) arrival.setDate(arrival.getDate() + 1);
    const qnaDay = reporting.getDate();
    const flightDigits = $('flightNumber').value.replace(/\D/g, '');
    const route = getFlightRoute(flightDigits);

    if (!route) {
      $('flightNumber').setCustomValidity(`Route for XJ${flightDigits || '___'} is not configured.`);
      $('flightNumber').reportValidity();
      $('flightNumber').setCustomValidity('');
      return;
    }

    const { origin, destination } = route;

    $('resultPosition').textContent = position;
    $('resultAircraft').textContent = aircraft.ui?.label || aircraft.name;
    $('resultRegistration').textContent = entry.registration;
    $('flightNumberDisplay').textContent = `XJ${flightDigits}`;
    $('departureDateDisplay').textContent = formatDateOnly(departure);
    $('routeDisplay').textContent = `${origin} → ${destination}`;
    $('departureDisplay').textContent = `${normalize24h($('departureTime').value)} H`;
    $('reportingDisplay').textContent = `${formatTimeOnly(reporting)} H · ${formatDateOnly(reporting)}`;

    const arrivalInput = normalize24h($('arrivalTime').value);
    $('arrivalDisplay').textContent = `${arrivalInput} H${arrival.getDate() !== departure.getDate() ? ' +1' : ''}`;
    $('blockHoursDisplay').textContent = $('blockHours').value.trim() || '—';
    $('qaDayDisplay').textContent = String(qnaDay).padStart(2, '0');
    $('paxDisplay').textContent = $('paxCount').value || '—';
    $('pbmDisplay').textContent = $('pbm').value || '—';
    $('salesTargetDisplay').textContent =
      route.salesTarget == null ? '—' : route.salesTarget.toLocaleString('en-US');
    renderCiq(destination);

    $('assignedStationTitle').textContent = position;
    $('briefingStation').textContent = positionData.passengerSafetyBriefingStation || '—';

    currentAircraftForPreflight = aircraft;

    const cleaningZone = positionData.cleaningZone || 'Not available in the supplied cleaning-zone chart.';
    $('cleaningZone').textContent = cleaningZone;
    $('cleaningZone').classList.add('preflight-target');
    $('cleaningZone').tabIndex = 0;
    $('cleaningZone').dataset.preflightType = 'zone';
    $('cleaningZone').dataset.preflightLabel = 'Assigned zone';
    $('cleaningZone').dataset.preflightLocation = cleaningZone;

    renderSecurityAreas(positionData.securityCheckAreas || []);
    renderEquipment(positionData.equipmentChecklist || []);
    renderKeyEquipment(aircraft, entry.registration);

    renderQna(qnaDay);
    saveForm();
    resultSection.classList.remove('hidden');
    resultSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }


  function getPreflightContent(target) {
    const type = target.dataset.preflightType || 'zone';
    const label = target.dataset.preflightLabel || '';
    const location = target.dataset.preflightLocation || '';
    const quantity = target.dataset.preflightQuantity || '';

    if (type === 'equipment') {
      const lines = [...PREFLIGHT_CHECKS.equipment.lines];
      if (location) lines.push(`Location: ${location}`);
      if (quantity) lines.push(`Quantity: ${quantity}`);
      return { title: label ? `${label} - pre-flight check` : PREFLIGHT_CHECKS.equipment.title, lines };
    }

    if (type === 'lavatory') {
      return { title: `${label || 'Lavatory'} - pre-flight check`, lines: PREFLIGHT_CHECKS.lavatory.lines };
    }

    if (type === 'galley') {
      return { title: `${label || 'Galley'} - pre-flight check`, lines: PREFLIGHT_CHECKS.galley.lines };
    }

    const rules = currentAircraftForPreflight?.sharedSecurityCheckRules || [];
    return {
      title: `${label || 'Assigned area'} - security check`,
      lines: [
        'Perform a security check in your assigned area.',
        ...rules,
        ...(location && label === 'Assigned zone' ? [`Assigned zone: ${location}`] : [])
      ]
    };
  }

  function positionPreflightPopover(target) {
    const popover = $('preflightPopover');
    const rect = target.getBoundingClientRect();
    const gap = 10;
    const margin = 12;
    const width = Math.min(390, window.innerWidth - margin * 2);

    popover.style.width = `${width}px`;
    popover.style.left = `${margin}px`;
    popover.style.top = `${margin}px`;
    popover.classList.remove('hidden');

    const popRect = popover.getBoundingClientRect();
    let left = rect.left + rect.width / 2 - popRect.width / 2;
    left = Math.max(margin, Math.min(left, window.innerWidth - popRect.width - margin));

    let top = rect.bottom + gap;
    if (top + popRect.height > window.innerHeight - margin) {
      top = rect.top - popRect.height - gap;
    }
    top = Math.max(margin, Math.min(top, window.innerHeight - popRect.height - margin));

    popover.style.left = `${left}px`;
    popover.style.top = `${top}px`;
  }

  function showPreflightPopover(target, pinned = false) {
    const popover = $('preflightPopover');
    const content = getPreflightContent(target);
    $('preflightPopoverTitle').textContent = content.title;
    $('preflightPopoverList').innerHTML = content.lines.map((line) => `<li>${escapeHtml(line)}</li>`).join('');
    popover.dataset.pinned = pinned ? 'true' : 'false';
    preflightPinnedTarget = pinned ? target : null;
    positionPreflightPopover(target);
  }

  function hidePreflightPopover(force = false) {
    const popover = $('preflightPopover');
    if (!force && popover.dataset.pinned === 'true') return;
    popover.classList.add('hidden');
    popover.dataset.pinned = 'false';
    preflightPinnedTarget = null;
  }

  function pdfSafe(value) {
    return String(value ?? '')
      .replaceAll('→', '->')
      .replaceAll('≤', '<=')
      .replaceAll('≥', '>=')
      .replaceAll('×', 'x')
      .replaceAll('–', '-')
      .replaceAll('—', '-')
      .replaceAll('“', '"')
      .replaceAll('”', '"')
      .replaceAll('’', "'")
      .replaceAll('•', '-');
  }

  function waitForImage(src) {
    return new Promise((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = reject;
      image.src = src;
    });
  }

  async function imageToJpeg(src, maxWidth = 1800, quality = 0.9) {
    const image = await waitForImage(src);
    const scale = Math.min(1, maxWidth / image.naturalWidth);
    const width = Math.max(1, Math.round(image.naturalWidth * scale));
    const height = Math.max(1, Math.round(image.naturalHeight * scale));
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, width, height);
    ctx.drawImage(image, 0, 0, width, height);
    return {
      dataUrl: canvas.toDataURL('image/jpeg', quality),
      width,
      height
    };
  }

  function collectEquipmentForPdf() {
    return [...document.querySelectorAll('#equipmentChecklist .equipment-group')].map((group) => {
      const location = group.querySelector('.equipment-location')?.textContent.trim() || '';
      const items = [...group.querySelectorAll('.equipment-item')].map((item) => {
        const codeEl = item.querySelector('.equipment-code');
        const code = codeEl?.childNodes?.[0]?.textContent?.trim() || codeEl?.textContent?.replace('VITAL', '').trim() || '';
        const qty = item.querySelector('.equipment-qty')?.textContent.trim() || '';
        const vital = item.classList.contains('vital') ? ' [VITAL]' : '';
        return `${code} ${qty}${vital}`.trim();
      });
      return { location, items };
    });
  }

  function collectKeyEquipmentForPdf() {
    return [...document.querySelectorAll('#keyEquipmentLocations .key-equipment-item')].map((card) => {
      const code = card.querySelector('.key-equipment-code')?.textContent.trim() || '';
      const locations = [...card.querySelectorAll('li')].map((li) => pdfSafe(li.textContent.trim()));
      return { code, locations };
    });
  }

  function collectCiqForPdf() {
    return [...document.querySelectorAll('#ciqContent .ciq-section')].map((section) => ({
      label: section.querySelector('.ciq-section-label')?.textContent.trim() || '',
      lines: [...section.querySelectorAll('.ciq-lines > div')].map((line) => line.textContent.trim())
    }));
  }

  async function downloadResultPdf() {
    if (resultSection.classList.contains('hidden')) return;

    const button = $('downloadPdfBtn');
    const originalLabel = button.textContent;
    button.disabled = true;
    button.textContent = 'Creating PDF...';

    try {
      if (!window.jspdf?.jsPDF) {
        window.print();
        return;
      }

      const { jsPDF } = window.jspdf;
      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4', compress: true });
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const margin = 14;
      const contentWidth = pageWidth - margin * 2;
      const bottom = pageHeight - 14;
      let y = 15;

      const ensureSpace = (needed = 10) => {
        if (y + needed > bottom) {
          doc.addPage();
          y = 15;
        }
      };

      const addWrapped = (text, options = {}) => {
        const size = options.size || 9;
        const style = options.style || 'normal';
        const indent = options.indent || 0;
        const gapAfter = options.gapAfter ?? 1.5;
        const maxWidth = contentWidth - indent;
        doc.setFont('helvetica', style);
        doc.setFontSize(size);
        const lines = doc.splitTextToSize(pdfSafe(text), maxWidth);
        const lineHeight = size * 0.45;
        ensureSpace(lines.length * lineHeight + gapAfter + 1);
        doc.text(lines, margin + indent, y);
        y += lines.length * lineHeight + gapAfter;
      };

      const addSection = (title) => {
        ensureSpace(10);
        y += 2;
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(12);
        doc.text(pdfSafe(title), margin, y);
        y += 2;
        doc.setDrawColor(210, 216, 222);
        doc.line(margin, y, pageWidth - margin, y);
        y += 5;
      };

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(18);
      doc.text('Flight Information', margin, y);
      y += 8;

      const summaryRows = [
        ['Flight', $('flightNumberDisplay').textContent],
        ['Route', $('routeDisplay').textContent],
        ['Date', $('departureDateDisplay').textContent],
        ['Aircraft', `${$('resultRegistration').textContent} - ${$('resultAircraft').textContent}`],
        ['Position', $('resultPosition').textContent],
        ['Reporting', $('reportingDisplay').textContent],
        ['Departure', $('departureDisplay').textContent],
        ['Arrival', $('arrivalDisplay').textContent],
        ['Block Hours', $('blockHoursDisplay').textContent],
        ['Pax', $('paxDisplay').textContent],
        ['PBM', $('pbmDisplay').textContent],
        ['Sales target', $('salesTargetDisplay').textContent]
      ];

      doc.setFontSize(9);
      summaryRows.forEach(([label, value]) => {
        ensureSpace(6);
        doc.setFont('helvetica', 'bold');
        doc.text(`${pdfSafe(label)}:`, margin, y);
        doc.setFont('helvetica', 'normal');
        const wrapped = doc.splitTextToSize(pdfSafe(value || '-'), contentWidth - 35);
        doc.text(wrapped, margin + 35, y);
        y += Math.max(5, wrapped.length * 4.2);
      });

      addSection('Assigned Area');
      addWrapped(`Passenger safety briefing: ${$('briefingStation').textContent}`);
      addWrapped(`Cleaning zone: ${$('cleaningZone').textContent}`);
      addWrapped('Security check area:', { style: 'bold', gapAfter: 0.5 });
      [...document.querySelectorAll('#securityAreas li')].forEach((li) => addWrapped(`- ${li.textContent.trim()}`, { indent: 4, gapAfter: 0.5 }));

      addSection('Safety & Emergency Equipment Checklist');
      collectEquipmentForPdf().forEach((group) => {
        addWrapped(group.location, { style: 'bold', gapAfter: 0.5 });
        addWrapped(group.items.join('   |   '), { indent: 4, gapAfter: 1.2 });
      });

      addSection('Key Equipment Locations');
      collectKeyEquipmentForPdf().forEach((item) => {
        addWrapped(`${item.code}: ${item.locations.join('; ') || 'Not shown'}`, { gapAfter: 1 });
      });

      addSection(`${$('ciqTitle').textContent} ${$('ciqAirportBadge').textContent}`.trim());
      const ciq = collectCiqForPdf();
      if (!ciq.length) {
        addWrapped($('ciqContent').textContent.trim() || 'No CIQ information available.');
      } else {
        ciq.forEach((section) => {
          if (section.label) addWrapped(section.label, { style: 'bold', gapAfter: 0.5 });
          section.lines.forEach((line) => addWrapped(`- ${line}`, { indent: 4, gapAfter: 0.5 }));
        });
      }

      addSection(`Q&A - Day ${$('qnaTitleDay').textContent}`);
      addWrapped(`Safety topic: ${$('qnaSafetyTopic').textContent}`, { style: 'bold' });
      addWrapped(`First Aid topic: ${$('qnaFirstAidTopic').textContent}`, { style: 'bold' });

      const diagramImage = $('equipmentDiagramImage');
      if (diagramImage?.getAttribute('src') && !diagramImage.closest('.hidden')) {
        try {
          const diagram = await imageToJpeg(diagramImage.getAttribute('src'), 1700, 0.9);
          doc.addPage();
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(13);
          doc.text(pdfSafe($('equipmentDiagramTitle').textContent || 'Aircraft Diagram'), margin, 14);
          const availableW = pageWidth - margin * 2;
          const availableH = pageHeight - 28;
          const ratio = Math.min(availableW / diagram.width, availableH / diagram.height);
          const w = diagram.width * ratio;
          const h = diagram.height * ratio;
          doc.addImage(diagram.dataUrl, 'JPEG', (pageWidth - w) / 2, 20, w, h, undefined, 'FAST');
        } catch (_) {}
      }

      const qnaImages = [...document.querySelectorAll('#qnaPages img')];
      for (let i = 0; i < qnaImages.length; i += 1) {
        const img = qnaImages[i];
        try {
          const pageImage = await imageToJpeg(img.getAttribute('src'), 1900, 0.9);
          doc.addPage();
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(11);
          doc.text(`Q&A Day ${$('qnaTitleDay').textContent} - Page ${i + 1}`, margin, 12);
          const availableW = pageWidth - margin * 2;
          const availableH = pageHeight - 24;
          const ratio = Math.min(availableW / pageImage.width, availableH / pageImage.height);
          const w = pageImage.width * ratio;
          const h = pageImage.height * ratio;
          doc.addImage(pageImage.dataUrl, 'JPEG', (pageWidth - w) / 2, 17, w, h, undefined, 'FAST');
        } catch (_) {}
      }

      const flight = ($('flightNumberDisplay').textContent || 'flight').replace(/[^A-Za-z0-9-]/g, '');
      const route = ($('routeDisplay').textContent || '').replace(/[^A-Za-z0-9]/g, '-').replace(/-+/g, '-');
      const position = ($('resultPosition').textContent || '').replace(/[^A-Za-z0-9]/g, '');
      const filename = [flight, route, position].filter(Boolean).join('_') + '.pdf';
      doc.save(filename);
    } catch (error) {
      console.error(error);
      alert('Could not create the PDF. Please try again.');
    } finally {
      button.disabled = false;
      button.textContent = originalLabel;
    }
  }

  $('downloadPdfBtn').addEventListener('click', downloadResultPdf);

  $('departureDate').addEventListener('input', (event) => {
    const digits = event.target.value.replace(/\D/g, '').slice(0, 8);
    let formatted = digits;

    if (digits.length > 4) {
      formatted = `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
    } else if (digits.length > 2) {
      formatted = `${digits.slice(0, 2)}/${digits.slice(2)}`;
    }

    event.target.value = formatted;
    event.target.setCustomValidity('');
  });

  $('departureDate').addEventListener('blur', (event) => {
    if (!event.target.value) return;
    const valid = parseDateInput(event.target.value);
    event.target.setCustomValidity(valid ? '' : 'Enter the date as DD/MM/YYYY, for example 16/09/2026.');
  });

  $('flightNumber').addEventListener('input', (event) => {
    event.target.value = event.target.value.replace(/\D/g, '').slice(0, 3);
    event.target.setCustomValidity('');
    updateRoutePreview();
  });

  crewPosition.addEventListener('input', () => {
    crewPosition.value = crewPosition.value.replace(/[^1-8]/g, '').slice(0, 1);
  });

  ['departureTime', 'arrivalTime'].forEach((id) => {
    $(id).addEventListener('input', (event) => {
      event.target.value = event.target.value.replace(/\D/g, '').slice(0, 4);
    });
  });

  $('paxCount').addEventListener('input', (event) => {
    event.target.value = event.target.value.replace(/\D/g, '').slice(0, 3);
  });

  $('pbm').addEventListener('input', (event) => {
    event.target.value = event.target.value.replace(/\D/g, '');
  });


  resultSection.addEventListener('mouseover', (event) => {
    const target = event.target.closest('.preflight-target');
    if (target && !preflightPinnedTarget) showPreflightPopover(target, false);
  });

  resultSection.addEventListener('mouseout', (event) => {
    const target = event.target.closest('.preflight-target');
    if (!target || preflightPinnedTarget) return;
    if (event.relatedTarget && target.contains(event.relatedTarget)) return;
    hidePreflightPopover();
  });

  resultSection.addEventListener('focusin', (event) => {
    const target = event.target.closest('.preflight-target');
    if (target && !preflightPinnedTarget) showPreflightPopover(target, false);
  });

  resultSection.addEventListener('focusout', () => {
    if (!preflightPinnedTarget) hidePreflightPopover();
  });

  resultSection.addEventListener('click', (event) => {
    const target = event.target.closest('.preflight-target');
    if (!target) return;
    event.stopPropagation();

    if (preflightPinnedTarget === target) {
      hidePreflightPopover(true);
      return;
    }

    showPreflightPopover(target, true);
  });

  $('closePreflightPopover').addEventListener('click', (event) => {
    event.stopPropagation();
    hidePreflightPopover(true);
  });

  document.addEventListener('click', (event) => {
    if (!preflightPinnedTarget) return;
    if ($('preflightPopover').contains(event.target)) return;
    if (event.target.closest('.preflight-target')) return;
    hidePreflightPopover(true);
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') hidePreflightPopover(true);
  });

  window.addEventListener('resize', () => {
    if (preflightPinnedTarget) positionPreflightPopover(preflightPinnedTarget);
    else hidePreflightPopover(true);
  });

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    renderResult();
  });

  $('resetBtn').addEventListener('click', () => {
    localStorage.removeItem('cabinDrillFormV3');
    form.reset();
    updateRoutePreview();
    aircraftSelect.value = registrationIndex[0]?.registration || 'HS-XTC';
    crewPosition.value = '2';
    setDefaultDate();
    resultSection.classList.add('hidden');
    if (equipmentDiagramDialog?.open) equipmentDiagramDialog.close();
  });

  $('enlargeEquipmentDiagram').addEventListener('click', () => {
    if ($('equipmentDiagramDialogImage').getAttribute('src')) equipmentDiagramDialog.showModal();
  });
  $('closeEquipmentDiagram').addEventListener('click', () => equipmentDiagramDialog.close());
  equipmentDiagramDialog.addEventListener('click', (event) => {
    if (event.target === equipmentDiagramDialog) equipmentDiagramDialog.close();
  });

  if (!aircraftSelect.value) aircraftSelect.value = registrationIndex[0]?.registration || 'HS-XTC';
  if (!crewPosition.value) crewPosition.value = '2';
  setDefaultDate();
  restoreForm();
  updateRoutePreview();
})();
