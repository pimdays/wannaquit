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

  function setDefaultDate() {
    if ($('departureDate').value) return;
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    $('departureDate').value = `${y}-${m}-${d}`;
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
    const [year, month, day] = dateValue.split('-').map(Number);
    const time = parse24hTime(timeValue);
    if (!time) return null;
    return new Date(year, month - 1, day + time.dayOffset, time.hour, time.minute, 0, 0);
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
      if (saved.departureDate) $('departureDate').value = saved.departureDate;
      if (saved.departureTime) $('departureTime').value = saved.departureTime;
      if (saved.arrivalTime) $('arrivalTime').value = saved.arrivalTime;
      if (saved.blockHours !== undefined) $('blockHours').value = saved.blockHours;
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
      alert('Enter departure and arrival times in 24-hour HHMM format, for example 0030 or 1745.');
      return;
    }

    const reporting = new Date(departure.getTime() - 75 * 60 * 1000);
    if (arrival < departure) arrival.setDate(arrival.getDate() + 1);
    const qnaDay = reporting.getDate();
    const flightDigits = $('flightNumber').value.replace(/\D/g, '');

    $('resultPosition').textContent = position;
    $('resultAircraft').textContent = aircraft.ui?.label || aircraft.name;
    $('resultRegistration').textContent = entry.registration;
    $('flightNumberDisplay').textContent = `XJ${flightDigits}`;
    $('departureDateDisplay').textContent = formatDateOnly(departure);
    $('departureDisplay').textContent = `${normalize24h($('departureTime').value)} H`;
    $('reportingDisplay').textContent = `${formatTimeOnly(reporting)} H · ${formatDateOnly(reporting)}`;

    const arrivalInput = normalize24h($('arrivalTime').value);
    $('arrivalDisplay').textContent = `${arrivalInput} H${arrival.getDate() !== departure.getDate() ? ' +1' : ''}`;
    $('blockHoursDisplay').textContent = $('blockHours').value.trim() || '—';
    $('qaDayDisplay').textContent = String(qnaDay).padStart(2, '0');
    $('pbmDisplay').textContent = $('pbm').value || '—';
    $('salesTargetDisplay').textContent = $('salesTarget').value || '—';

    $('assignedStationTitle').textContent = position;
    $('briefingStation').textContent = positionData.passengerSafetyBriefingStation || '—';

    const cleaningZone = positionData.cleaningZone || 'Not available in the supplied cleaning-zone chart.';
    $('cleaningZone').textContent = cleaningZone;
    renderList($('securityAreas'), positionData.securityCheckAreas || []);
    renderEquipment(positionData.equipmentChecklist || []);

    renderQna(qnaDay);
    saveForm();
    resultSection.classList.remove('hidden');
    resultSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

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
  });

  if (!aircraftSelect.value) aircraftSelect.value = registrationIndex[0]?.registration || 'HS-XTC';
  if (!crewPosition.value) crewPosition.value = '2';
  setDefaultDate();
  restoreForm();
})();
