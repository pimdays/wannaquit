(() => {
  const APP = window.CABIN_DRILL_DATA;
  if (!APP) {
    document.body.insertAdjacentHTML('afterbegin', '<div style="padding:12px;background:#fff0f0;color:#a22;font-weight:700">Data file could not be loaded. Make sure app-data.js is in the same folder as index.html.</div>');
    throw new Error('Cabin drill data not loaded.');
  }

  const $ = (id) => document.getElementById(id);
  const form = $('drillForm');
  const aircraftSelect = $('aircraftSelect');
  const positionButtons = $('positionButtons');
  const positionValue = $('positionValue');
  const resultSection = $('resultSection');
  const seatmapDialog = $('seatmapDialog');

  const state = { position: 'P2' };
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

  function populateAircrafts() {
    aircraftSelect.innerHTML = registrationIndex.map((entry, i) =>
      `<option value="${i}">${escapeHtml(entry.registration)} · ${escapeHtml(entry.label)}</option>`
    ).join('');
  }

  function populatePositions() {
    positionButtons.innerHTML = Array.from({ length: 8 }, (_, index) => {
      const position = `P${index + 1}`;
      return `<button type="button" class="position-button ${position === state.position ? 'active' : ''}" data-position="${position}" aria-pressed="${position === state.position}">${position}</button>`;
    }).join('');
    positionValue.value = state.position;
  }

  function selectPosition(position) {
    if (!/^P[1-8]$/.test(position)) return;
    state.position = position;
    positionValue.value = position;
    positionButtons.querySelectorAll('.position-button').forEach((button) => {
      const active = button.dataset.position === position;
      button.classList.toggle('active', active);
      button.setAttribute('aria-pressed', String(active));
    });
  }

  function setDefaultDate() {
    if ($('departureDate').value) return;
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    $('departureDate').value = `${y}-${m}-${d}`;
  }

  function parseLocalDate(dateValue, timeValue) {
    const [year, month, day] = dateValue.split('-').map(Number);
    const [hour, minute] = timeValue.split(':').map(Number);
    return new Date(year, month - 1, day, hour, minute, 0, 0);
  }

  function formatDateTime(date) {
    return new Intl.DateTimeFormat('en-GB', {
      weekday: 'short', day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit', hour12: false
    }).format(date);
  }

  function formatTimeOnly(date) {
    return new Intl.DateTimeFormat('en-GB', {
      hour: '2-digit', minute: '2-digit', hour12: false
    }).format(date);
  }

  function formatDateOnly(date) {
    return new Intl.DateTimeFormat('en-GB', {
      day: '2-digit', month: 'short', year: 'numeric'
    }).format(date);
  }

  function getSelectedAircraft() {
    const index = Number(aircraftSelect.value);
    const entry = registrationIndex[Number.isInteger(index) && registrationIndex[index] ? index : 0];
    if (!entry) throw new Error('No aircraft registrations are available.');
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

  function renderQna(day) {
    const pageNumbers = APP.qna.pages[String(day)] || APP.qna.pages[day] || [];
    const topic = APP.qna.topics[String(day)] || APP.qna.topics[day] || '';
    $('qnaTitleDay').textContent = String(day).padStart(2, '0');
    $('qnaTopic').textContent = topic;
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
    localStorage.setItem('cabinDrillFormV2', JSON.stringify({
      flightNumber: $('flightNumber').value,
      aircraftSelect: aircraftSelect.value,
      position: state.position,
      departureDate: $('departureDate').value,
      departureTime: $('departureTime').value,
      arrivalTime: $('arrivalTime').value,
      pbm: $('pbm').value,
      salesTarget: $('salesTarget').value
    }));
  }

  function restoreForm() {
    try {
      const saved = JSON.parse(localStorage.getItem('cabinDrillFormV2') || '{}');
      if (saved.flightNumber) $('flightNumber').value = saved.flightNumber;
      if (saved.aircraftSelect !== undefined && registrationIndex[Number(saved.aircraftSelect)]) aircraftSelect.value = saved.aircraftSelect;
      if (/^P[1-8]$/.test(saved.position || '')) selectPosition(saved.position);
      if (saved.departureDate) $('departureDate').value = saved.departureDate;
      if (saved.departureTime) $('departureTime').value = saved.departureTime;
      if (saved.arrivalTime) $('arrivalTime').value = saved.arrivalTime;
      if (saved.pbm !== undefined) $('pbm').value = saved.pbm;
      if (saved.salesTarget !== undefined) $('salesTarget').value = saved.salesTarget;
    } catch (_) {}
  }

  function renderResult() {
    if (!form.reportValidity()) return;

    const { entry, aircraft } = getSelectedAircraft();
    const position = state.position;
    const positionData = aircraft.positions[position];
    if (!positionData) {
      alert(`No drill data found for ${position}.`);
      return;
    }

    const departure = parseLocalDate($('departureDate').value, $('departureTime').value);
    const reporting = new Date(departure.getTime() - 75 * 60 * 1000);
    const arrival = parseLocalDate($('departureDate').value, $('arrivalTime').value);
    if (arrival < departure) arrival.setDate(arrival.getDate() + 1);
    const qnaDay = reporting.getDate();

    $('resultPosition').textContent = position;
    $('resultAircraft').textContent = aircraft.ui?.label || aircraft.name;
    $('resultRegistration').textContent = entry.registration;
    $('flightNumberDisplay').textContent = $('flightNumber').value.trim();
    $('departureDateDisplay').textContent = formatDateOnly(departure);
    $('departureDisplay').textContent = formatTimeOnly(departure);
    $('reportingDisplay').textContent = `${formatTimeOnly(reporting)} · ${formatDateOnly(reporting)}`;
    $('arrivalDisplay').textContent = `${formatTimeOnly(arrival)}${arrival.getDate() !== departure.getDate() ? ' +1' : ''}`;
    $('qaDayDisplay').textContent = String(qnaDay).padStart(2, '0');
    $('pbmDisplay').textContent = $('pbm').value || '—';
    $('salesTargetDisplay').textContent = $('salesTarget').value || '—';

    $('assignedStationTitle').textContent = position;
    $('attendantStation').textContent = positionData.attendantStation || '—';
    $('briefingStation').textContent = positionData.passengerSafetyBriefingStation || '—';
    $('equipmentStation').textContent = positionData.safetyEmergencyEquipmentCheckStation || '—';

    const cleaningZone = positionData.cleaningZone || 'Not available in the supplied cleaning-zone chart.';
    $('cleaningZone').textContent = cleaningZone;
    $('cleaningZoneOverlay').textContent = cleaningZone;
    renderList($('securityAreas'), positionData.securityCheckAreas || []);
    renderList($('sharedSecurityRules'), aircraft.sharedSecurityCheckRules || []);
    renderEquipment(positionData.equipmentChecklist || []);

    $('seatmapTitle').textContent = entry.registration;
    const seatMapPath = (aircraft.seatConfiguration?.image || '').replace(/^assets\/aircraft\//, '');
    $('seatmapImage').src = seatMapPath;
    $('seatmapImage').alt = `${entry.registration} seat configuration`;
    $('seatmapDialogImage').src = seatMapPath;

    renderQna(qnaDay);
    saveForm();
    resultSection.classList.remove('hidden');
    resultSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  positionButtons.addEventListener('click', (event) => {
    const button = event.target.closest('.position-button');
    if (button) selectPosition(button.dataset.position);
  });

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    renderResult();
  });

  $('resetBtn').addEventListener('click', () => {
    localStorage.removeItem('cabinDrillFormV2');
    form.reset();
    aircraftSelect.value = '0';
    selectPosition('P2');
    setDefaultDate();
    resultSection.classList.add('hidden');
  });

  $('enlargeSeatmap').addEventListener('click', () => seatmapDialog.showModal());
  $('closeSeatmap').addEventListener('click', () => seatmapDialog.close());
  seatmapDialog.addEventListener('click', (event) => {
    if (event.target === seatmapDialog) seatmapDialog.close();
  });

  populateAircrafts();
  populatePositions();
  setDefaultDate();
  restoreForm();
})();
