(() => {
  const APP = window.CABIN_DRILL_DATA;
  if (!APP) throw new Error('Cabin drill data not loaded.');

  const $ = (id) => document.getElementById(id);
  const form = $('drillForm');
  const aircraftSelect = $('aircraftSelect');
  const positionButtons = $('positionButtons');
  const positionValue = $('positionValue');
  const resultSection = $('resultSection');
  const seatmapDialog = $('seatmapDialog');

  const state = {
    position: 'P2'
  };

  const registrationIndex = [];
  APP.drill.aircraft.forEach((aircraft, aircraftIndex) => {
    aircraft.ui.registrations.forEach((registration) => {
      registrationIndex.push({ registration, aircraftIndex, label: aircraft.ui.label });
    });
  });

  function populateAircrafts() {
    aircraftSelect.innerHTML = registrationIndex.map((entry, i) =>
      `<option value="${i}">${entry.registration} · ${entry.label}</option>`
    ).join('');
  }

  function populatePositions() {
    positionButtons.innerHTML = Array.from({ length: 8 }, (_, index) => {
      const position = `P${index + 1}`;
      return `<button type="button" class="position-button ${position === state.position ? 'active' : ''}" data-position="${position}">${position}</button>`;
    }).join('');
    positionValue.value = state.position;
  }

  function selectPosition(position) {
    state.position = position;
    positionValue.value = position;
    positionButtons.querySelectorAll('.position-button').forEach((button) => {
      button.classList.toggle('active', button.dataset.position === position);
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

  function getSelectedAircraft() {
    const entry = registrationIndex[Number(aircraftSelect.value) || 0];
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
      const path = `assets/qna/day-${String(day).padStart(2, '0')}-page-${index + 1}.webp`;
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
    localStorage.setItem('cabinDrillForm', JSON.stringify({
      crewRegistration: $('crewRegistration').value,
      aircraftSelect: aircraftSelect.value,
      position: state.position,
      departureDate: $('departureDate').value,
      departureTime: $('departureTime').value
    }));
  }

  function restoreForm() {
    try {
      const saved = JSON.parse(localStorage.getItem('cabinDrillForm') || '{}');
      if (saved.crewRegistration) $('crewRegistration').value = saved.crewRegistration;
      if (saved.aircraftSelect !== undefined && registrationIndex[Number(saved.aircraftSelect)]) aircraftSelect.value = saved.aircraftSelect;
      if (/^P[1-8]$/.test(saved.position || '')) selectPosition(saved.position);
      if (saved.departureDate) $('departureDate').value = saved.departureDate;
      if (saved.departureTime) $('departureTime').value = saved.departureTime;
    } catch (_) {}
  }

  function renderResult() {
    if (!form.reportValidity()) return;
    const { entry, aircraft } = getSelectedAircraft();
    const position = state.position;
    const positionData = aircraft.positions[position];
    const departure = parseLocalDate($('departureDate').value, $('departureTime').value);
    const reporting = new Date(departure.getTime() - 75 * 60 * 1000);
    const qnaDay = reporting.getDate();

    $('resultPosition').textContent = position;
    $('resultAircraft').textContent = aircraft.ui.label;
    $('resultRegistration').textContent = entry.registration;
    $('departureDisplay').textContent = formatDateTime(departure);
    $('reportingDisplay').textContent = formatDateTime(reporting);
    $('qaDayDisplay').textContent = String(qnaDay).padStart(2, '0');

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
    $('seatmapImage').src = aircraft.seatConfiguration.image;
    $('seatmapImage').alt = `${entry.registration} seat configuration`;
    $('seatmapDialogImage').src = aircraft.seatConfiguration.image;

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
    localStorage.removeItem('cabinDrillForm');
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
