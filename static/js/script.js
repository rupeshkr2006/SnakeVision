(() => {
  'use strict';

  const form = document.getElementById('upload-form');
  const biteInput = document.getElementById('bite-image');
  const snakeInput = document.getElementById('snake-image');
  const button = document.getElementById('analyze-button');
  const progress = document.getElementById('progress');
  const resultsSection = document.getElementById('results-section');
  const biteResultCard = document.getElementById('bite-result-card');
  const speciesResultCard = document.getElementById('species-result-card');
  const previewUrls = new Map();

  const imageControls = [
    { input: biteInput, zone: document.getElementById('bite-drop-zone'), preview: document.getElementById('bite-preview'), placeholder: document.getElementById('bite-placeholder'), filename: document.getElementById('bite-file-name'), key: 'bite', emptyText: 'No bite-area photo selected' },
    { input: snakeInput, zone: document.getElementById('snake-drop-zone'), preview: document.getElementById('snake-preview'), placeholder: document.getElementById('snake-placeholder'), filename: document.getElementById('snake-file-name'), key: 'snake', emptyText: 'No snake photo selected' },
  ];

  const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/bmp'];
  const maxBytes = 8 * 1024 * 1024;
  const percent = value => `${(Number(value) * 100).toFixed(1)}%`;

  function setImage(control, file) {
    if (!file) {
      control.input.value = '';
      control.preview.classList.add('hidden');
      control.placeholder.classList.remove('hidden');
      control.filename.textContent = control.emptyText;
      const prior = previewUrls.get(control.key);
      if (prior) URL.revokeObjectURL(prior);
      previewUrls.delete(control.key);
      return;
    }
    if (!allowed.includes(file.type)) {
      progress.textContent = 'Please select a JPG, PNG, WEBP, or BMP image.';
      control.input.value = '';
      return;
    }
    if (file.size <= 0 || file.size > maxBytes) {
      progress.textContent = `${file.name} is empty or exceeds the 8 MB per-image limit.`;
      control.input.value = '';
      return;
    }
    const prior = previewUrls.get(control.key);
    if (prior) URL.revokeObjectURL(prior);
    const url = URL.createObjectURL(file);
    previewUrls.set(control.key, url);
    control.preview.src = url;
    control.preview.classList.remove('hidden');
    control.placeholder.classList.add('hidden');
    control.filename.textContent = `${file.name} · ${(file.size / 1024 / 1024).toFixed(2)} MB`;
    progress.textContent = '';
  }

  imageControls.forEach(control => {
    control.input.addEventListener('change', () => setImage(control, control.input.files[0]));
    ['dragenter', 'dragover'].forEach(name => control.zone.addEventListener(name, event => {
      event.preventDefault();
      control.zone.classList.add('dragging');
    }));
    ['dragleave', 'drop'].forEach(name => control.zone.addEventListener(name, event => {
      event.preventDefault();
      control.zone.classList.remove('dragging');
    }));
    control.zone.addEventListener('drop', event => {
      const file = event.dataTransfer.files[0];
      if (!file || control.input.disabled) return;
      try {
        const transfer = new DataTransfer();
        transfer.items.add(file);
        control.input.files = transfer.files;
      } catch (_) { /* Standard file picker remains available. */ }
      setImage(control, file);
    });
  });

  function fillScoreList(element, items, colorClass = '') {
    element.replaceChildren();
    (items || []).forEach(item => {
      const row = document.createElement('div'); row.className = 'score-row';
      const name = document.createElement('span'); name.className = 'score-name'; name.textContent = item.label;
      const track = document.createElement('span'); track.className = 'score-track';
      const fill = document.createElement('span'); fill.className = `score-fill ${colorClass}`;
      fill.style.width = `${Math.max(0, Math.min(100, Number(item.score) * 100))}%`;
      track.appendChild(fill);
      const pct = document.createElement('span'); pct.className = 'score-pct'; pct.textContent = percent(item.score);
      row.append(name, track, pct); element.appendChild(row);
    });
  }

  function fillList(element, items) {
    element.replaceChildren();
    (items || []).forEach(item => {
      const li = document.createElement('li');
      li.textContent = String(item);
      element.appendChild(li);
    });
  }

  function fillSources(element, sources) {
    element.replaceChildren();
    if (!sources || !sources.length) return;
    const heading = document.createElement('strong');
    heading.textContent = 'References';
    element.appendChild(heading);
    const list = document.createElement('ul');
    sources.forEach(source => {
      if (!source || typeof source.url !== 'string' || !/^https?:\/\//i.test(source.url)) return;
      const li = document.createElement('li');
      const link = document.createElement('a');
      link.href = source.url;
      link.textContent = source.label || source.url;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      li.appendChild(link);
      list.appendChild(li);
    });
    element.appendChild(list);
  }

  function displayWarnings(containerId, listId, items) {
    const container = document.getElementById(containerId);
    const list = document.getElementById(listId);
    if (!items || !items.length) {
      container.classList.add('hidden');
      list.replaceChildren();
      return;
    }
    container.classList.remove('hidden');
    fillList(list, items);
  }

  function clearResults() {
    biteResultCard.classList.add('hidden');
    speciesResultCard.classList.add('hidden');
    resultsSection.classList.add('hidden');
    document.getElementById('species-uncertain-banner').classList.add('hidden');
    document.getElementById('species-candidate').classList.add('hidden');
  }

  function displayBite(result) {
    if (!result) return;
    biteResultCard.classList.remove('hidden');
    let heading = `Model output: ${result.label}`;
    if (!result.class_mapping_verified) {
      heading = `Unverified mapping — output class ${result.class_index} (proposed label: ${result.proposed_label})`;
    }
    document.getElementById('bite-label').textContent = heading;
    document.getElementById('bite-confidence').textContent = percent(result.confidence);
    fillScoreList(document.getElementById('bite-scores'), result.probabilities);
    document.getElementById('bite-medical-warning').textContent = result.medical_warning;
    fillList(document.getElementById('first-aid-list'), result.first_aid);
    displayWarnings('bite-warnings', 'bite-warning-list', result.warnings);
    fillSources(document.getElementById('bite-sources'), result.sources);
  }

  function displaySpecies(result) {
    if (!result) return;
    speciesResultCard.classList.remove('hidden');
    const info = result.species_info || {};
    document.getElementById('species-label').textContent = result.label;
    document.getElementById('species-confidence').textContent = percent(result.confidence);
    fillScoreList(document.getElementById('species-scores'), result.top_predictions, 'purple');
    document.getElementById('species-notice').textContent = result.notice || '';
    displayWarnings('species-warnings', 'species-warning-list', result.warnings);

    const uncertaintyBanner = document.getElementById('species-uncertain-banner');
    const candidate = document.getElementById('species-candidate');
    const status = document.getElementById('species-status');
    const precautionsWrap = document.getElementById('species-precautions-wrap');
    if (result.uncertain) {
      uncertaintyBanner.classList.remove('hidden');
      document.getElementById('species-uncertain-reason').textContent =
        `The top score is ${percent(result.confidence)} and the top-two score margin is ${percent(result.top_two_margin)}. This result is being withheld as a confident identification.`;
      candidate.textContent = `Top candidate (not a confirmed species): ${result.candidate_label || 'unknown'}`;
      candidate.classList.remove('hidden');
      document.getElementById('species-scientific-name').textContent = 'No scientific name assigned for an uncertain result.';
      status.textContent = 'Species/risk status not assigned';
      status.className = 'status-badge caution';
      document.getElementById('species-summary').textContent =
        'The image may be unrelated, blurred, low-detail, or difficult for this classifier. Do not infer that a snake is present or absent from this output.';
      fillList(document.getElementById('species-precautions'), [
        'Do not approach, touch, corner, or attempt to identify a snake at close range.',
        'Keep people and pets away; contact a trained local snake rescuer if a snake is present.',
        'For any suspected bite, seek emergency medical care immediately.'
      ]);
      fillSources(document.getElementById('species-sources'), []);
      precautionsWrap.querySelector('h4').textContent = 'General safety guidance (species not identified)';
    } else {
      uncertaintyBanner.classList.add('hidden');
      candidate.classList.add('hidden');
      document.getElementById('species-scientific-name').textContent = info.scientific_name || 'Scientific name not verified';
      status.textContent = `Risk information: ${info.venom_status || 'Unknown — treat as potentially dangerous'}`;
      status.className = `status-badge ${info.status_class || 'caution'}`;
      document.getElementById('species-summary').textContent = info.summary || '';
      fillList(document.getElementById('species-precautions'), info.precautions || []);
      fillSources(document.getElementById('species-sources'), info.sources || []);
      precautionsWrap.querySelector('h4').textContent = 'Precautions for the predicted species';
    }
  }

  async function loadDiagnostics() {
    const mapping = document.getElementById('diag-bite-order');
    const preprocessing = document.getElementById('diag-bite-preprocess');
    const threshold = document.getElementById('diag-species-threshold');
    try {
      const response = await fetch('/api/diagnostics', { cache: 'no-store' });
      const data = await response.json();
      const bite = data.bite_model || {};
      const species = data.species_model || {};
      mapping.textContent = bite.class_order_verified ? 'Verified' : 'Needs MATLAB verification';
      mapping.className = `diagnostic-status ${bite.class_order_verified ? 'good' : 'needs-review'}`;
      preprocessing.textContent = bite.input_preprocessing_verified ? 'Verified' : 'Needs MATLAB verification';
      preprocessing.className = `diagnostic-status ${bite.input_preprocessing_verified ? 'good' : 'needs-review'}`;
      threshold.textContent = species.thresholds_validated ? 'Validation calibrated' : 'Preliminary only';
      threshold.className = `diagnostic-status ${species.thresholds_validated ? 'good' : 'needs-review'}`;
    } catch (_) {
      [mapping, preprocessing, threshold].forEach(node => {
        node.textContent = 'Diagnostics unavailable';
        node.className = 'diagnostic-status needs-review';
      });
    }
  }

  form.addEventListener('submit', async event => {
    event.preventDefault();
    const biteFile = biteInput.files[0];
    const snakeFile = snakeInput.files[0];
    if (!biteFile && !snakeFile) {
      progress.textContent = 'Upload a bite-area photo, a snake photo, or both in their separate boxes.';
      return;
    }
    if ((biteFile && !allowed.includes(biteFile.type)) || (snakeFile && !allowed.includes(snakeFile.type))) {
      progress.textContent = 'One of the selected files is not a supported image type.';
      return;
    }
    if ((biteFile && biteFile.size > maxBytes) || (snakeFile && snakeFile.size > maxBytes)) {
      progress.textContent = 'Each image must be 8 MB or smaller.';
      return;
    }

    button.disabled = true;
    button.querySelector('span:first-child').textContent = 'Analyzing…';
    progress.textContent = 'Running each selected image through its matching model. The upload is processed in memory.';
    clearResults();

    try {
      const body = new FormData();
      if (biteFile) body.append('bite_image', biteFile);
      if (snakeFile) body.append('snake_image', snakeFile);
      const response = await fetch('/api/predict', { method: 'POST', body, cache: 'no-store' });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || data.details || `Request failed (${response.status})`);
      displayBite(data.bite_result);
      displaySpecies(data.species_result);
      resultsSection.classList.remove('hidden');
      progress.textContent = data.safety_notice || 'Analysis complete. Predictions are estimates.';
      resultsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } catch (error) {
      progress.textContent = error.message || 'Analysis failed. Check the local VS Code terminal.';
    } finally {
      button.disabled = false;
      button.querySelector('span:first-child').textContent = 'Analyze selected image(s)';
    }
  });

  loadDiagnostics();
  window.addEventListener('beforeunload', () => {
    previewUrls.forEach(url => URL.revokeObjectURL(url));
  });
})();
