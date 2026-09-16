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

    ALA: {
      place: 'Almaty',
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

  function renderList(element, items) {
    element.innerHTML = items.map((item) => `<li>${escapeHtml(item)}</li>`).join('');
  }

  function renderEquipment(groups) {
    $('equipmentChecklist').innerHTML = groups.map((group) => {
      const items = group.items.map((equipment) => {
        const vital = equipment.vitalEmergency;
        return `
          <div class="equipment-item ${vital ? 'vital' : ''}">
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
            <li>
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
    const pageNumbers = APP.qna.pages[String(day)] || APP.qna.pages[day] || [];
    const topic = APP.qna.topics[String(day)] || APP.qna.topics[day] || '';
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
      originAirport: $('originAirport').value,
      destinationAirport: $('destinationAirport').value,
      pbm: $('pbm').value,
      salesTarget: $('salesTarget').value
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
      if (saved.originAirport !== undefined) $('originAirport').value = String(saved.originAirport).toUpperCase().replace(/[^A-Z]/g, '').slice(0, 3);
      if (saved.destinationAirport !== undefined) $('destinationAirport').value = String(saved.destinationAirport).toUpperCase().replace(/[^A-Z]/g, '').slice(0, 3);
      if (saved.pbm !== undefined) $('pbm').value = saved.pbm;
      if (saved.salesTarget !== undefined) $('salesTarget').value = saved.salesTarget;
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
    const origin = $('originAirport').value.trim().toUpperCase();
    const destination = $('destinationAirport').value.trim().toUpperCase();

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
    $('pbmDisplay').textContent = $('pbm').value || '—';
    $('salesTargetDisplay').textContent = $('salesTarget').value || '—';
    renderCiq(destination);

    $('assignedStationTitle').textContent = position;
    $('briefingStation').textContent = positionData.passengerSafetyBriefingStation || '—';

    const cleaningZone = positionData.cleaningZone || 'Not available in the supplied cleaning-zone chart.';
    $('cleaningZone').textContent = cleaningZone;
    renderList($('securityAreas'), positionData.securityCheckAreas || []);
    renderEquipment(positionData.equipmentChecklist || []);
    renderKeyEquipment(aircraft, entry.registration);

    renderQna(qnaDay);
    saveForm();
    resultSection.classList.remove('hidden');
    resultSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

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
    event.target.value = event.target.value.replace(/\D/g, '');
  });

  crewPosition.addEventListener('input', () => {
    crewPosition.value = crewPosition.value.replace(/[^1-8]/g, '').slice(0, 1);
  });

  ['departureTime', 'arrivalTime'].forEach((id) => {
    $(id).addEventListener('input', (event) => {
      event.target.value = event.target.value.replace(/\D/g, '').slice(0, 4);
    });
  });

  ['originAirport', 'destinationAirport'].forEach((id) => {
    $(id).addEventListener('input', (event) => {
      event.target.value = event.target.value
        .toUpperCase()
        .replace(/[^A-Z]/g, '')
        .slice(0, 3);
    });
  });

  $('pbm').addEventListener('input', (event) => {
    event.target.value = event.target.value.replace(/\D/g, '');
  });

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    renderResult();
  });

  $('resetBtn').addEventListener('click', () => {
    localStorage.removeItem('cabinDrillFormV3');
    form.reset();
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
})();
