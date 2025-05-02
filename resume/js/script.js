/**
 * File: js/script.js
 * Handles language switching and client-side PDF generation for the resume page.
 * Includes functionality to force desktop layout in PDF and place a resized QR code.
 */

document.addEventListener('DOMContentLoaded', () => {
    // --- Bagian Terjemahan ---
    const langIdBtn = document.getElementById('lang-id-btn');
    const langEnBtn = document.getElementById('lang-en-btn');
    const translatableElements = document.querySelectorAll('[data-translate]');
    let currentLangData = {}; // Menyimpan data bahasa yang aktif (misal: dari id.json atau en.json)

    /**
     * Memuat file JSON bahasa dan memperbarui UI.
     * @param {string} lang Kode bahasa ('id' atau 'en').
     */
    async function loadLanguage(lang) {
        // Validasi input sederhana
        if (lang !== 'id' && lang !== 'en') {
            console.error(`Invalid language code: ${lang}. Defaulting to 'id'.`);
            lang = 'id';
        }
        try {
            const response = await fetch(`lang/${lang}.json`);
            if (!response.ok) {
                throw new Error(`Network response was not ok: ${response.statusText}`);
            }
            currentLangData = await response.json(); // Simpan data bahasa
            updateTextElements(); // Update teks di HTML
            updateHtmlLangAttribute(lang); // Update <html lang="...">
            setActiveButton(lang); // Update tombol bahasa aktif
            localStorage.setItem('preferredLang', lang); // Simpan preferensi
            console.log(`Language loaded successfully: ${lang}`);
        } catch (error) {
            console.error('Error loading language file:', error);
            // Tambahkan fallback atau notifikasi error jika diperlukan
            alert(`Failed to load language: ${lang}. Please check console.`);
        }
    }

    /**
     * Memperbarui konten teks elemen HTML berdasarkan data bahasa saat ini.
     */
    function updateTextElements() {
        if (!currentLangData || Object.keys(currentLangData).length === 0) {
            // Jangan update jika data belum ada atau kosong, tunggu loadLanguage selesai
            // console.warn("Skipping text update: Language data not ready.");
            return;
        }
        translatableElements.forEach(element => {
            const key = element.getAttribute('data-translate');
            if (key && currentLangData[key] !== undefined) { // Cek key ada dan punya nilai (bisa string kosong)
                // Handle <title> tag
                if (element.tagName === 'TITLE') {
                    document.title = currentLangData[key];
                }
                // Handle text within the download button's span
                else if (element.matches('span[data-translate]') && element.closest('.download-button')) {
                    element.textContent = currentLangData[key];
                }
                // Handle all other translatable elements
                else if (!element.closest('.download-button')) { // Pastikan tidak menimpa tombol lagi
                    element.textContent = currentLangData[key];
                }
            } else if (key) {
                // console.warn(`Translation key "${key}" not found or value is missing in current language file.`); // Opsional: log jika key hilang
            }
        });
         // Update teks tombol generate PDF secara eksplisit jika belum tertangani ATAU saat bahasa berubah
         const downloadBtn = document.getElementById('generate-pdf-btn'); // Tombol/Link download
         const downloadBtnSpan = downloadBtn?.querySelector('span[data-translate="download_pdf_button"]');
         const downloadBtnTextKey = "download_pdf_button";
         if (downloadBtnSpan && currentLangData[downloadBtnTextKey] !== undefined) {
             // Pastikan tombol tidak sedang dalam state 'Generating...'
             if (!downloadBtn.hasAttribute('data-generating')) {
                 downloadBtnSpan.textContent = currentLangData[downloadBtnTextKey];
             }
         }
    }


    /**
     * Memperbarui atribut 'lang' pada elemen <html>.
     * @param {string} lang Kode bahasa.
     */
    function updateHtmlLangAttribute(lang) {
        document.documentElement.lang = lang;
    }

    /**
     * Menandai tombol bahasa yang aktif secara visual.
     * @param {string} lang Kode bahasa yang aktif.
     */
    function setActiveButton(lang) {
        if (langIdBtn) langIdBtn.classList.toggle('active', lang === 'id');
        if (langEnBtn) langEnBtn.classList.toggle('active', lang === 'en');
    }

    // Tambahkan event listener untuk tombol pengalih bahasa
    if (langIdBtn) {
        langIdBtn.addEventListener('click', () => {
            if (document.documentElement.lang !== 'id') loadLanguage('id');
        });
    }
    if (langEnBtn) {
        langEnBtn.addEventListener('click', () => {
            if (document.documentElement.lang !== 'en') loadLanguage('en');
        });
    }

    // Muat bahasa yang tersimpan atau default ke 'id' saat halaman dimuat
    const preferredLang = localStorage.getItem('preferredLang') || 'id';
    // Panggil loadLanguage di awal. updateTextElements akan dipanggil di dalamnya.
    loadLanguage(preferredLang);
    // --- Akhir Bagian Terjemahan ---


    // --- Logika Generate PDF ---
    const generatePdfBtn = document.getElementById('generate-pdf-btn');
    const elementToCapture = document.querySelector('.resume-container');
    const qrImageElement = document.getElementById('qrCodeForPdf'); // Elemen <img> QR code tersembunyi
    const downloadLinkContainer = document.getElementById('download-pdf-link-container'); // Div yg berisi tombol download

    // Konstanta untuk konfigurasi PDF dan layout
    const DESKTOP_WIDTH_PX = 1200; // Target lebar render (sesuaikan dengan max-width .resume-container)
    const SIDEBAR_WIDTH_RATIO = 0.33; // Proporsi lebar sidebar (sesuaikan dengan CSS)
    const PDF_MARGIN_INCHES = 0.5; // Margin di semua sisi PDF (inci)
    // Ukuran target QR code di PDF (inci) - Sesuaikan nilai ini jika perlu
    const QR_WIDTH_INCHES = 1.7; // Lebih besar
    const QR_HEIGHT_INCHES = 1.7; // Jaga tetap sama agar square

    // Pastikan semua elemen yang diperlukan ada sebelum menambahkan event listener
    if (generatePdfBtn && elementToCapture && qrImageElement && downloadLinkContainer) {

        generatePdfBtn.addEventListener('click', (event) => {
            event.preventDefault(); // Mencegah aksi default (penting jika tombolnya adalah link <a>)
            // Cek jika proses sudah berjalan
            if (generatePdfBtn.hasAttribute('data-generating')) {
                console.log("PDF generation already in progress.");
                return;
            }
            console.log("Generate PDF process started...");
            generatePdfBtn.setAttribute('data-generating', 'true'); // Tandai proses berjalan

            // Ambil teks tombol saat ini untuk dikembalikan nanti
            const originalButtonTextSpan = generatePdfBtn.querySelector('span[data-translate="download_pdf_button"]');
            const originalButtonText = originalButtonTextSpan ? originalButtonTextSpan.textContent : "Download PDF"; // Fallback
             // Ambil teks "Generating..." dari file bahasa jika ada
            const generatingTextKey = "generating_pdf"; // Key di file JSON
            const generatingText = (currentLangData && currentLangData[generatingTextKey]) ? currentLangData[generatingTextKey] : "Generating..."; // Fallback

            // Beri feedback visual ke pengguna dan nonaktifkan tombol
            if (originalButtonTextSpan) originalButtonTextSpan.textContent = generatingText;
            else generatePdfBtn.textContent = generatingText; // Jika tidak ada span
            generatePdfBtn.style.pointerEvents = 'none'; // Nonaktifkan klik
            generatePdfBtn.style.opacity = '0.7'; // Redupkan tombol

            const pdfFilename = 'Raden_Danny_Ramadhan_Resume.pdf';

            // Konfigurasi untuk html2canvas dan jsPDF
            const options = {
                margin: PDF_MARGIN_INCHES,
                filename: pdfFilename,
                image: { type: 'jpeg', quality: 0.98 }, // Gunakan JPEG untuk ukuran file lebih kecil
                html2canvas: {
                    scale: 2, // Meningkatkan resolusi rendering
                    useCORS: true, // Perlu jika ada gambar dari domain lain di resume
                    logging: false, // Set true untuk melihat log debug html2canvas
                    width: DESKTOP_WIDTH_PX, // Paksa lebar render
                    windowWidth: DESKTOP_WIDTH_PX, // Simulasikan window lebar
                    // Fungsi yang dijalankan pada elemen DOM kloningan sebelum render
                    onclone: (documentClone) => {
                        const containerClone = documentClone.querySelector('.resume-container');
                        if (containerClone) {
                            console.log("Cloning DOM for PDF: Forcing desktop layout and hiding elements...");
                            // Paksa gaya layout desktop
                            containerClone.style.width = `${DESKTOP_WIDTH_PX}px`;
                            containerClone.style.maxWidth = 'none';
                            containerClone.style.display = 'flex';
                            containerClone.style.flexDirection = 'row';

                            // Sembunyikan elemen yang tidak perlu di PDF
                            const linkContainerClone = documentClone.getElementById('download-pdf-link-container');
                            if (linkContainerClone) linkContainerClone.style.display = 'none';

                            const langSwitcherClone = documentClone.querySelector('.language-switcher');
                            if (langSwitcherClone) langSwitcherClone.style.display = 'none';

                            const mobileFooterClone = documentClone.querySelector('.mobile-footer');
                            if (mobileFooterClone) mobileFooterClone.style.display = 'none';
                        } else {
                             console.error("Critical: Could not find .resume-container in cloned document!");
                        }
                    }
                },
                // Konfigurasi jsPDF
                jsPDF: {
                    unit: 'in', // Satuan: inci
                    format: 'a4', // Ukuran kertas
                    orientation: 'portrait' // Orientasi
                }
            };

            // Mulai proses rendering HTML ke Canvas
            console.log("Starting html2canvas...");
            html2canvas(elementToCapture, options.html2canvas).then(canvas => {
                console.log("html2canvas finished. Generating PDF pages...");
                const imgData = canvas.toDataURL(options.image.type, options.image.quality); // Dapatkan data gambar
                const pdf = new jspdf.jsPDF(options.jsPDF); // Buat instance jsPDF

                // Dapatkan dimensi halaman PDF dan area konten
                const pdfPageWidth = pdf.internal.pageSize.getWidth();
                const pdfPageHeight = pdf.internal.pageSize.getHeight();
                const contentMargin = options.margin;
                const contentWidthPdf = pdfPageWidth - (contentMargin * 2); // Lebar area konten
                const usablePageHeight = pdfPageHeight - (2 * contentMargin); // Tinggi area konten

                // Hitung tinggi total gambar konten yang dirender sesuai proporsi
                const imgProps = pdf.getImageProperties(imgData);
                const contentHeightPdf = (imgProps.height * contentWidthPdf) / imgProps.width;

                // --- Logika Pagination ---
                let heightLeft = contentHeightPdf; // Sisa tinggi konten
                let positionY = contentMargin; // Posisi Y awal untuk potongan gambar
                let currentPage = 1; // Halaman saat ini

                console.log(`Adding page ${currentPage}... Total content height: ${contentHeightPdf.toFixed(2)}in, Usable page height: ${usablePageHeight.toFixed(2)}in`);
                // Tambahkan gambar utuh (atau potongan pertama) ke halaman 1
                pdf.addImage(imgData, options.image.type, contentMargin, positionY, contentWidthPdf, contentHeightPdf);
                heightLeft -= usablePageHeight; // Kurangi tinggi yang sudah terpakai

                // Tambahkan halaman baru jika konten melebihi satu halaman
                while (heightLeft > 0) {
                    currentPage++;
                    console.log(`Adding page ${currentPage}... Height left: ${heightLeft.toFixed(2)}in`);
                    // Hitung posisi Y negatif untuk memotong gambar dari atas pada halaman sebelumnya
                    positionY = -(usablePageHeight * (currentPage - 1)) + contentMargin;
                    pdf.addPage(); // Buat halaman baru
                    // Tambahkan potongan gambar berikutnya
                    pdf.addImage(imgData, options.image.type, contentMargin, positionY, contentWidthPdf, contentHeightPdf);
                    heightLeft -= usablePageHeight; // Kurangi lagi sisa tinggi
                }
                console.log(`Finished adding content. Total pages generated: ${currentPage}`);
                // --- Akhir Pagination ---

                // --- Tambahkan QR Code ---
                let qrTargetPage; // Halaman target untuk QR code
                let desiredQrY; // Posisi Y target untuk QR code

                // Hitung lebar virtual sidebar di PDF
                const sidebarWidthPdf = contentWidthPdf * SIDEBAR_WIDTH_RATIO;
                // Hitung posisi X (horizontal) agar QR code center di area sidebar kiri
                // Gunakan QR_WIDTH_INCHES yang baru
                const desiredQrX = contentMargin + (sidebarWidthPdf / 2) - (QR_WIDTH_INCHES / 2);

                // Tentukan halaman target dan Posisi Y berdasarkan jumlah halaman
                if (currentPage >= 2) {
                    qrTargetPage = 2; // Targetkan halaman 2 jika ada
                    // Posisi Y: Margin atas + 1/4 tinggi area konten halaman
                    desiredQrY = contentMargin + (usablePageHeight / 8);
                    console.log(`QR Code target: Page ${qrTargetPage}. Calculated Y (1/4 down page 2): ${desiredQrY.toFixed(2)}in`);
                } else {
                    // Fallback: Jika hanya 1 halaman, letakkan di dekat bawah halaman 1
                    qrTargetPage = 1;
                    const bottomPadding = 0.8; // Jarak dari batas margin bawah (sesuaikan jika perlu)
                    // Gunakan QR_HEIGHT_INCHES yang baru untuk perhitungan fallback Y
                    desiredQrY = pdfPageHeight - QR_HEIGHT_INCHES - contentMargin - bottomPadding;
                    console.log(`QR Code target: Page ${qrTargetPage} (Fallback). Calculated Y (near bottom): ${desiredQrY.toFixed(2)}in`);
                }

                console.log(`Switching to page ${qrTargetPage} to add QR Code...`);
                pdf.setPage(qrTargetPage); // Pindah ke halaman target

                try {
                    // Coba deteksi tipe gambar QR dari src (harapannya PNG atau JPG/JPEG)
                    let qrImageType = 'PNG'; // Default ke PNG
                    const qrSrcLower = qrImageElement.src.toLowerCase();
                    if (qrSrcLower.endsWith('.jpg') || qrSrcLower.endsWith('.jpeg')) {
                        qrImageType = 'JPEG';
                    } else if (!qrSrcLower.endsWith('.png')) {
                         console.warn("QR Code image source is not ending with .png, .jpg, or .jpeg. Assuming PNG.");
                    }

                    console.log(`Attempting to add QR Image (${qrImageType}) at X:${desiredQrX.toFixed(2)}, Y:${desiredQrY.toFixed(2)} with size ${QR_WIDTH_INCHES}x${QR_HEIGHT_INCHES}in`);
                    // Tambahkan gambar QR code ke PDF dengan ukuran yang sudah ditentukan
                    pdf.addImage(qrImageElement, qrImageType, desiredQrX, desiredQrY, QR_WIDTH_INCHES, QR_HEIGHT_INCHES);
                    console.log("QR Code added successfully.");
                } catch (e) {
                    console.error("Error adding QR code image to PDF:", e);
                    alert("Error adding QR code image. It might not be loaded correctly or the format is unsupported.");
                }
                // --- Selesai Tambah QR Code ---

                console.log(`Saving PDF: ${options.filename}`);
                // Simpan dan picu download file PDF
                pdf.save(options.filename);

            }).catch(error => {
                console.error("Error during PDF generation process:", error);
                alert("Failed to generate PDF. Please check the console for more details."); // Notifikasi error ke pengguna
            }).finally(() => {
                // Kembalikan teks tombol dan aktifkan kembali setelah proses selesai (baik sukses maupun gagal)
                 if(originalButtonTextSpan) {
                     originalButtonTextSpan.textContent = originalButtonText;
                 } else {
                     generatePdfBtn.textContent = originalButtonText;
                 }
                 generatePdfBtn.style.pointerEvents = 'auto'; // Aktifkan kembali klik
                 generatePdfBtn.style.opacity = '1'; // Kembalikan opasitas normal
                 generatePdfBtn.removeAttribute('data-generating'); // Hapus flag proses berjalan
                 console.log("PDF generation process finished.");
            });
        }); // Akhir event listener klik
    } else {
        // Log peringatan jika elemen penting tidak ditemukan saat halaman dimuat
        console.warn("One or more elements required for PDF generation were not found on the page. PDF generation functionality disabled. Check IDs: generate-pdf-btn, qrCodeForPdf, download-pdf-link-container and class: resume-container.");
        // Nonaktifkan tombol jika elemen hilang
        if (generatePdfBtn) {
            generatePdfBtn.style.pointerEvents = 'none';
            generatePdfBtn.style.opacity = '0.5';
            generatePdfBtn.title = "PDF generation disabled due to missing elements.";
             const btnSpan = generatePdfBtn.querySelector('span');
             if(btnSpan) btnSpan.textContent = "PDF Disabled";
        }
    }

}); // Akhir event listener DOMContentLoaded
