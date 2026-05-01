/* ============================================================
   Certificate Upload App — Supabase Storage
   ============================================================ */

const SUPABASE_URL  = 'https://vzfhlednbnqmrqjewtxl.supabase.co';
const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ6ZmhsZWRuYm5xbXJxamV3dHhsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzczMDczOTEsImV4cCI6MjA5Mjg4MzM5MX0.Vk3FNUjMfI_vZvPkP-S9D68W09N102gmjJuqCgcrbJM';
const BUCKET        = 'certificates';

/* ──── State ──── */
const state = { dbmsFile: null, mathFile: null };
let supabaseClient = null;

/* ──── Helpers ──── */
function $(id) { return document.getElementById(id); }

/* ──── Initialize everything on DOM ready ──── */
document.addEventListener('DOMContentLoaded', function () {
    // Wire up UI first (works even if Supabase CDN hasn't loaded yet)
    setupDropzone('dbms');
    setupForm();

    // Initialize Supabase client
    initSupabase();
});

function initSupabase() {
    try {
        if (window.supabase && window.supabase.createClient) {
            supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON);
            console.log('Supabase initialized successfully');
        } else {
            console.warn('Supabase library not yet loaded, retrying in 500ms...');
            setTimeout(initSupabase, 500);
        }
    } catch (err) {
        console.error('Supabase init error:', err);
    }
}

/* ──── Dropzone ──── */
function setupDropzone(key) {
    var dropzone = $(key + '-dropzone');
    var input    = $(key + '-file');

    if (!dropzone || !input) {
        console.error('Dropzone or input not found for:', key);
        return;
    }

    // Click anywhere on the dropzone -> open file picker
    dropzone.addEventListener('click', function (e) {
        // Don't re-open picker if remove button was clicked
        if (e.target.closest('.btn-remove')) return;
        input.value = '';  // reset so same file can be re-selected
        input.click();
    });

    // Keyboard support
    dropzone.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            input.click();
        }
    });

    // Drag & drop
    dropzone.addEventListener('dragenter', function (e) { e.preventDefault(); dropzone.classList.add('drag-over'); });
    dropzone.addEventListener('dragover',  function (e) { e.preventDefault(); dropzone.classList.add('drag-over'); });
    dropzone.addEventListener('dragleave', function (e) { e.preventDefault(); dropzone.classList.remove('drag-over'); });
    dropzone.addEventListener('drop', function (e) {
        e.preventDefault();
        dropzone.classList.remove('drag-over');
        var file = e.dataTransfer.files[0];
        if (file) handleFile(key, file);
    });

    // When a file is selected via the picker
    input.addEventListener('change', function () {
        if (input.files && input.files[0]) {
            handleFile(key, input.files[0]);
        }
    });

    // Remove button
    var removeBtn = $(key + '-remove');
    if (removeBtn) {
        removeBtn.addEventListener('click', function (e) {
            e.stopPropagation();
            clearFile(key);
        });
    }
}

function handleFile(key, file) {
    // Validate image type
    if (!file.type.startsWith('image/')) {
        showToast('Only image files are allowed.', 'error');
        return;
    }

    state[key + 'File'] = file;

    var dropzone = $(key + '-dropzone');
    var content  = dropzone.querySelector('.dropzone-content');
    var preview  = $(key + '-preview');
    var thumb    = $(key + '-thumb');
    var nameEl   = $(key + '-name');

    // Show thumbnail preview
    thumb.src = URL.createObjectURL(file);
    nameEl.textContent = file.name;

    content.style.display = 'none';
    preview.style.display = 'flex';
    dropzone.classList.add('has-file');

    // Remove error state
    $(key + '-group').classList.remove('has-error');
}

function clearFile(key) {
    state[key + 'File'] = null;

    var dropzone = $(key + '-dropzone');
    var content  = dropzone.querySelector('.dropzone-content');
    var preview  = $(key + '-preview');
    var thumb    = $(key + '-thumb');
    var input    = $(key + '-file');

    URL.revokeObjectURL(thumb.src);
    thumb.src = '';
    content.style.display = '';
    preview.style.display = 'none';
    dropzone.classList.remove('has-file');
    input.value = '';
}

/* ──── Form ──── */
function setupForm() {
    var form = $('upload-form');
    form.addEventListener('submit', function (e) {
        e.preventDefault();
        handleSubmit();
    });

    $('upload-another').addEventListener('click', resetToForm);
}

async function handleSubmit() {
    var rollInput = $('roll-number');
    var nameInput = $('student-name');
    var roll = rollInput.value.trim().toUpperCase();
    var studentName = nameInput.value.trim().toUpperCase();

    // Validate
    var valid = true;

    const ALLOWED_ROLL_NUMBERS = [
        '25BCAN0668', '25BCAN0107', '25BCAN0108', '25BCAN0109', '25BCAN0110',
        '25BCAN0119', '25BCAN0127', '25BCAN0128', '25BCAN0129', '25BCAN0130',
        '25BCAN0131', '25BCAN0132', '25BCAN0133', '25BCAN0144', '25BCAN0147',
        '25BCAN0153', '25BCAN0154', '25BCAN0164', '25BCAN0168', '25BCAN0169',
        '25BCAN0172', '25BCAN0178', '25BCAN0179', '25BCAN0180', '25BCAN0183',
        '25BCAN0185', '25BCAN0194', '25BCAN0202', '25BCAN0672', '25BCAN0683'
    ];

    if (!roll) {
        $('roll-group').classList.add('has-error');
        showToast('Roll number is required.', 'error');
        rollInput.focus();
        valid = false;
    } else if (!ALLOWED_ROLL_NUMBERS.includes(roll)) {
        $('roll-group').classList.add('has-error');
        showToast('Upload not permitted: invalid roll number.', 'error');
        if (valid) rollInput.focus();
        valid = false;
    } else {
        $('roll-group').classList.remove('has-error');
    }

    if (!studentName) {
        $('name-group').classList.add('has-error');
        if (valid) { showToast('Student name is required.', 'error'); nameInput.focus(); }
        valid = false;
    } else {
        $('name-group').classList.remove('has-error');
    }

    if (!state.dbmsFile) {
        $('dbms-group').classList.add('has-error');
        if (valid) showToast('Please upload the DBMS certificate.', 'error');
        valid = false;
    }

    if (!valid) return;

    // Check Supabase is ready
    if (!supabaseClient) {
        showToast('Supabase is still loading. Please wait a moment and try again.', 'error');
        return;
    }

    // Show loading state
    var btn     = $('submit-btn');
    var btnText = btn.querySelector('.btn-text');
    var btnLoad = btn.querySelector('.btn-loader');

    btn.disabled = true;
    btnText.style.display = 'none';
    btnLoad.style.display = 'inline-flex';

    try {
        var ts = Date.now();
        var dbmsPath = 'DBMS/' + roll + '_DBMS.jpg';

        // Upload DBMS certificate
        var dbmsResult = await supabaseClient.storage
            .from(BUCKET)
            .upload(dbmsPath, state.dbmsFile, { upsert: true, contentType: state.dbmsFile.type });

        if (dbmsResult.error) {
            // Fallback: append timestamp if upsert not allowed
            var dbmsFallback = 'DBMS/' + roll + '_DBMS_' + ts + '.jpg';
            var dbmsFb = await supabaseClient.storage
                .from(BUCKET)
                .upload(dbmsFallback, state.dbmsFile, { contentType: state.dbmsFile.type });
            if (dbmsFb.error) throw new Error('DBMS upload failed: ' + dbmsFb.error.message);
        }

        // Log submission to database
        var { error: dbError } = await supabaseClient
            .from('submissions')
            .insert({ roll_number: roll, student_name: studentName });

        if (dbError) console.warn('DB insert warning:', dbError.message);

        // Success!
        showSuccess(roll);

    } catch (err) {
        console.error('Upload error:', err);
        showToast(err.message || 'Upload failed. Please try again.', 'error');
    } finally {
        btn.disabled = false;
        btnText.style.display = '';
        btnLoad.style.display = 'none';
    }
}

/* ──── Success / Reset ──── */
function showSuccess(roll) {
    $('upload-card').style.display = 'none';
    var card = $('success-card');
    card.style.display = '';
    card.removeAttribute('hidden');
    card.style.animation = 'none';
    void card.offsetWidth;
    card.style.animation = '';

    $('success-detail').innerHTML =
        'Certificates for roll number <strong>' + roll + '</strong> have been uploaded successfully.';
}

function resetToForm() {
    $('success-card').style.display = 'none';
    $('upload-card').style.display = '';

    $('roll-number').value = '';
    $('student-name').value = '';
    clearFile('dbms');
    ['roll-group', 'name-group', 'dbms-group'].forEach(function (id) {
        $(id).classList.remove('has-error');
    });
}

/* ──── Toast Notifications ──── */
function showToast(message, type) {
    type = type || 'error';
    var container = $('toast-container');
    var el = document.createElement('div');
    el.className = 'toast toast-' + type;
    el.setAttribute('role', 'alert');

    var icon = type === 'error'
        ? '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>'
        : '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>';

    el.innerHTML = icon + '<span>' + message + '</span>';
    container.appendChild(el);

    setTimeout(function () {
        el.classList.add('toast-exit');
        el.addEventListener('animationend', function () { el.remove(); });
    }, 4000);
}
