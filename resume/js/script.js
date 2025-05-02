document.addEventListener('DOMContentLoaded', () => {
    const langIdBtn = document.getElementById('lang-id-btn');
    const langEnBtn = document.getElementById('lang-en-btn');
    const translatableElements = document.querySelectorAll('[data-translate]');
    let currentLangData = {};

    // Function to fetch language data
    async function loadLanguage(lang) {
        try {
            const response = await fetch(`lang/${lang}.json`);
            if (!response.ok) {
                throw new Error(`Could not load language file: ${response.statusText}`);
            }
            currentLangData = await response.json();
            updateTextElements();
            updateHtmlLangAttribute(lang); // Update HTML lang attr
            setActiveButton(lang); // Update active button style
            localStorage.setItem('preferredLang', lang); // Store preference
        } catch (error) {
            console.error('Error loading language:', error);
            // Optionally fallback to a default language or show an error
        }
    }

    // Function to update text content
    function updateTextElements() {
        translatableElements.forEach(element => {
            const key = element.getAttribute('data-translate');
            if (currentLangData[key]) {
                // Handle special cases like title
                if (element.tagName === 'TITLE') {
                    document.title = currentLangData[key];
                } else {
                    element.textContent = currentLangData[key];
                }
            } else {
                console.warn(`Translation key "${key}" not found in language file.`);
                // Keep original text if key not found (useful for debugging)
            }
        });
    }

    // Function to update HTML lang attribute
    function updateHtmlLangAttribute(lang) {
        document.documentElement.lang = lang;
    }

     // Function to set the active button style
     function setActiveButton(lang) {
        if (lang === 'id') {
            langIdBtn.classList.add('active');
            langEnBtn.classList.remove('active');
        } else if (lang === 'en') {
            langEnBtn.classList.add('active');
            langIdBtn.classList.remove('active');
        }
     }

    // Event listeners for buttons
    langIdBtn.addEventListener('click', () => {
        if (document.documentElement.lang !== 'id') {
            loadLanguage('id');
        }
    });

    langEnBtn.addEventListener('click', () => {
         if (document.documentElement.lang !== 'en') {
            loadLanguage('en');
        }
    });

    // Initial load: Check localStorage or default to 'id'
    const preferredLang = localStorage.getItem('preferredLang') || 'id';
    loadLanguage(preferredLang);
});

document.addEventListener('DOMContentLoaded', () => {
    const langIdBtn = document.getElementById('lang-id-btn');
    const langEnBtn = document.getElementById('lang-en-btn');
    const translatableElements = document.querySelectorAll('[data-translate]');
    let currentLangData = {};

    // --- Fungsi terjemahan (loadLanguage, updateTextElements, dll seperti sebelumnya) ---
    async function loadLanguage(lang) {
        try {
            const response = await fetch(`lang/${lang}.json`);
            if (!response.ok) throw new Error(`Could not load language file: ${response.statusText}`);
            currentLangData = await response.json();
            updateTextElements();
            updateHtmlLangAttribute(lang);
            setActiveButton(lang);
            localStorage.setItem('preferredLang', lang);
        } catch (error) {
            console.error('Error loading language:', error);
        }
    }

    function updateTextElements() {
        translatableElements.forEach(element => {
            const key = element.getAttribute('data-translate');
            if (currentLangData[key]) {
                if (element.tagName === 'TITLE') {
                    document.title = currentLangData[key];
                } else {
                    // Periksa jika elemen adalah tombol download, update text di dalam span
                    if (element.closest('.download-button')) {
                         const span = element.closest('.download-button').querySelector('span');
                         if(span && span.getAttribute('data-translate') === key) {
                            span.textContent = currentLangData[key];
                         }
                    } else {
                        element.textContent = currentLangData[key];
                    }
                }
            } else if(key) { // Hanya warn jika key ada tapi tidak ditemukan
                 console.warn(`Translation key "${key}" not found.`);
            }
        });
    }

    function updateHtmlLangAttribute(lang) {
        document.documentElement.lang = lang;
    }

     function setActiveButton(lang) {
        langIdBtn.classList.toggle('active', lang === 'id');
        langEnBtn.classList.toggle('active', lang === 'en');
     }

    langIdBtn.addEventListener('click', () => { if (document.documentElement.lang !== 'id') loadLanguage('id'); });
    langEnBtn.addEventListener('click', () => { if (document.documentElement.lang !== 'en') loadLanguage('en'); });

    const preferredLang = localStorage.getItem('preferredLang') || 'id';
    loadLanguage(preferredLang); // Muat bahasa awal


    // --- Logika Generate PDF ---
    const generatePdfBtn = document.getElementById('generate-pdf-btn'); // Targetkan tombol/link download
    const elementToCapture = document.querySelector('.resume-container');
    const qrImageElement = document.getElementById('qrCodeForPdf');
    const downloadLinkContainer = document.getElementById('download-pdf-link-container'); // Targetkan container link

    if (generatePdfBtn && elementToCapture && qrImageElement && downloadLinkContainer) {
        generatePdfBtn.addEventListener('click', (event) => {
            event.preventDefault(); // Cegah link default jika ini tag <a>
            console.log("Generate PDF process started...");

            // Simpan display style asli dari container link download
            const originalDisplay = downloadLinkContainer.style.display;

            const pdfFilename = 'Raden_Danny_Ramadhan_Resume.pdf';
            const options = {
                margin: 0.5,
                filename: pdfFilename,
                image: { type: 'jpeg', quality: 0.98 },
                html2canvas: {
                    scale: 2,
                    useCORS: true,
                    logging: false, // Set ke true untuk debug html2canvas
                    onclone: (documentClone) => {
                        // Sembunyikan container tombol download di DOKUMEN HASIL KLONINGAN
                        const linkContainerClone = documentClone.getElementById('download-pdf-link-container');
                        if (linkContainerClone) {
                            linkContainerClone.style.display = 'none';
                            console.log("Download link hidden in cloned document for PDF.");
                        }
                        // Sembunyikan language switcher juga
                        const langSwitcherClone = documentClone.querySelector('.language-switcher');
                        if (langSwitcherClone) {
                            langSwitcherClone.style.display = 'none';
                        }
                    }
                },
                jsPDF: { unit: 'in', format: 'a4', orientation: 'portrait' }
            };

            // Ukuran dan posisi QR Code dalam PDF (dalam inci) - Perlu disesuaikan!
            const qrWidthInPdf = 0.9; // Sedikit lebih besar mungkin?
            const qrHeightInPdf = 0.9;
            // Estimasi Posisi X (di dalam area sidebar)
            // Margin kiri PDF + sedikit tambahan
            const desiredQrX = options.margin + 0.2; // Misal 0.5 + 0.2 = 0.7 inci dari kiri

            // Estimasi Posisi Y (di bawah area mentorship) - INI PERLU DISESUAIKAN MANUAL
            // Coba letakkan sekitar 8 inci dari atas di halaman A4 (tinggi total ~11.7 inci)
            const desiredQrY = 8.0; // Sesuaikan nilai ini setelah mencoba!

            console.log("Starting html2canvas...");
            html2canvas(elementToCapture, options.html2canvas).then(canvas => {
                console.log("html2canvas finished.");
                const imgData = canvas.toDataURL(options.image.type, options.image.quality);
                const pdf = new jspdf.jsPDF(options.jsPDF);

                const pdfPageWidth = pdf.internal.pageSize.getWidth();
                const pdfPageHeight = pdf.internal.pageSize.getHeight();
                const contentMargin = options.margin;
                const contentWidth = pdfPageWidth - (contentMargin * 2);
                const imgProps = pdf.getImageProperties(imgData);
                const contentHeight = (imgProps.height * contentWidth) / imgProps.width;

                let heightLeft = contentHeight;
                let position = contentMargin;
                let currentPage = 1;

                console.log(`Adding page ${currentPage} of main content...`);
                pdf.addImage(imgData, options.image.type, contentMargin, position, contentWidth, contentHeight);
                heightLeft -= (pdfPageHeight - (2 * contentMargin));

                while (heightLeft > 0) {
                    currentPage++;
                    console.log(`Adding page ${currentPage} of main content...`);
                    position = heightLeft - contentHeight - contentMargin; // Mungkin perlu penyesuaian
                    pdf.addPage();
                    pdf.addImage(imgData, options.image.type, contentMargin, position, contentWidth, contentHeight);
                    heightLeft -= pdfPageHeight;
                }

                // --- Tambahkan QR Code ke Halaman Pertama (karena menggantikan elemen sidebar) ---
                console.log("Adding QR Code to page 1...");
                pdf.setPage(1); // Set ke halaman pertama

                try {
                    let qrImageType = qrImageElement.src.split('.').pop().toUpperCase();
                     if (qrImageType === 'JPG') qrImageType = 'JPEG';
                     // Pastikan tipenya adalah PNG jika file Anda .png
                     if (qrImageElement.src.toLowerCase().endsWith('.png')) qrImageType = 'PNG';


                    console.log(`Attempting to add QR Image (${qrImageType}) at X:${desiredQrX.toFixed(2)}, Y:${desiredQrY.toFixed(2)}`);
                    pdf.addImage(qrImageElement, qrImageType, desiredQrX, desiredQrY, qrWidthInPdf, qrHeightInPdf);
                    console.log("QR Code added successfully.");
                } catch (e) {
                    console.error("Error adding QR code image to PDF:", e);
                }
                // --- Selesai Tambah QR Code ---

                console.log(`Saving PDF: ${options.filename}`);
                pdf.save(options.filename);

            }).catch(error => {
                console.error("Error during PDF generation:", error);
            }).finally(() => {
                 // Kembalikan tampilan tombol download di HTML setelah proses selesai/gagal
                 // downloadLinkContainer.style.display = originalDisplay;
                 // Sebaiknya tidak perlu dikembalikan, biarkan saja event listener yang bekerja
                 console.log("PDF generation process finished.");
            });
        });
    } else {
        console.warn("Required elements for PDF generation not found (button, container, QR img, or link container).");
    }
});
