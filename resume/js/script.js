document.addEventListener('DOMContentLoaded', () => {
    // --- Bagian Terjemahan ---
    const langIdBtn = document.getElementById('lang-id-btn');
    const langEnBtn = document.getElementById('lang-en-btn');
    const translatableElements = document.querySelectorAll('[data-translate]');
    let currentLangData = {}; // Menyimpan data bahasa yang aktif

    /**
     * Memuat file JSON bahasa dan memperbarui UI.
     * @param {string} lang Kode bahasa (misal: 'id', 'en').
     */
    async function loadLanguage(lang) {
        try {
            const response = await fetch(`lang/${lang}.json`);
            if (!response.ok) {
                throw new Error(`Could not load language file: ${response.statusText}`);
            }
            currentLangData = await response.json(); // Simpan data bahasa yang baru
            updateTextElements(); // Perbarui teks di halaman
            updateHtmlLangAttribute(lang); // Update atribut lang di <html>
            setActiveButton(lang); // Tandai tombol bahasa yang aktif
            localStorage.setItem('preferredLang', lang); // Simpan preferensi bahasa
            console.log(`Language loaded: ${lang}`);
        } catch (error) {
            console.error('Error loading language:', error);
            // Mungkin tambahkan fallback atau pesan error ke pengguna
        }
    }

    /**
     * Memperbarui elemen teks di halaman berdasarkan data bahasa saat ini.
     */
    function updateTextElements() {
        translatableElements.forEach(element => {
            const key = element.getAttribute('data-translate');
            // Hanya proses jika key ada dan terdefinisi di file bahasa
            if (key && currentLangData[key]) {
                // Penanganan khusus untuk tag <title>
                if (element.tagName === 'TITLE') {
                    document.title = currentLangData[key];
                } else {
                    // Penanganan khusus untuk tombol download agar hanya span di dalamnya yg berubah
                    const downloadButtonSpan = element.closest('.download-button')?.querySelector('span[data-translate]');
                    if (downloadButtonSpan && downloadButtonSpan.getAttribute('data-translate') === key) {
                         downloadButtonSpan.textContent = currentLangData[key];
                    }
                    // Untuk elemen lain atau jika bukan tombol download
                    else if (!element.closest('.download-button')) {
                         element.textContent = currentLangData[key];
                    }
                }
            } else if (key) {
                // Beri peringatan jika key ada di HTML tapi tidak ada di JSON
                // console.warn(`Translation key "${key}" not found in language file.`);
            }
        });
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
        langIdBtn.classList.toggle('active', lang === 'id');
        langEnBtn.classList.toggle('active', lang === 'en');
     }

    // Tambahkan event listener untuk tombol bahasa
    if (langIdBtn) {
        langIdBtn.addEventListener('click', () => {
            if (document.documentElement.lang !== 'id') {
                loadLanguage('id');
            }
        });
    }
     if (langEnBtn) {
        langEnBtn.addEventListener('click', () => {
             if (document.documentElement.lang !== 'en') {
                loadLanguage('en');
            }
        });
    }

    // Muat bahasa pilihan pengguna atau default ke 'id' saat halaman pertama kali dibuka
    const preferredLang = localStorage.getItem('preferredLang') || 'id';
    loadLanguage(preferredLang);


    // --- Logika Generate PDF ---
    const generatePdfBtn = document.getElementById('generate-pdf-btn'); // Tombol/link download
    const elementToCapture = document.querySelector('.resume-container'); // Kontainer utama resume
    const qrImageElement = document.getElementById('qrCodeForPdf'); // Elemen <img> QR code tersembunyi
    const downloadLinkContainer = document.getElementById('download-pdf-link-container'); // Kontainer tombol download

    // Lebar desktop target (sesuaikan jika max-width di CSS resume-container berbeda)
    const DESKTOP_WIDTH_PX = 1200;
    // Proporsi lebar sidebar relatif terhadap lebar total (sesuaikan jika di CSS berbeda)
    const SIDEBAR_WIDTH_RATIO = 0.33; // 33%

    // Pastikan semua elemen yang diperlukan ada
    if (generatePdfBtn && elementToCapture && qrImageElement && downloadLinkContainer) {
        generatePdfBtn.addEventListener('click', (event) => {
            event.preventDefault(); // Mencegah aksi default jika elemennya adalah link <a>
            console.log("Generate PDF process started...");

            // Ambil teks tombol saat ini untuk dikembalikan nanti
            const originalButtonTextSpan = generatePdfBtn.querySelector('span[data-translate="download_pdf_button"]');
            const originalButtonText = originalButtonTextSpan ? originalButtonTextSpan.textContent : "Download PDF"; // Fallback text
            const generatingText = currentLangData.generating_pdf || "Generating..."; // Ambil dari JSON jika ada, atau default

            // Beri feedback ke pengguna dan nonaktifkan tombol
             if(originalButtonTextSpan) {
                 originalButtonTextSpan.textContent = generatingText;
             } else {
                 // Jika tidak ada span (misal hanya tombol), ganti teks tombol langsung
                 generatePdfBtn.textContent = generatingText;
             }
            generatePdfBtn.style.pointerEvents = 'none'; // Nonaktifkan klik selama proses

            const pdfFilename = 'Raden_Danny_Ramadhan_Resume.pdf';
            const options = {
                margin: 0.5, // Margin dalam inci
                filename: pdfFilename,
                image: { type: 'jpeg', quality: 0.98 }, // Tipe dan kualitas gambar hasil render
                html2canvas: {
                    scale: 2, // Tingkatkan skala untuk resolusi PDF yang lebih baik
                    useCORS: true, // Perlu jika ada gambar dari domain lain
                    logging: false, // Set ke true untuk melihat log debug html2canvas
                    width: DESKTOP_WIDTH_PX, // Paksa lebar render ke ukuran desktop
                    windowWidth: DESKTOP_WIDTH_PX, // Simulasikan lebar window desktop
                    // Fungsi onclone dijalankan pada DOM hasil kloningan sebelum render
                    onclone: (documentClone) => {
                        const containerClone = documentClone.querySelector('.resume-container');
                        if (containerClone) {
                            console.log("Forcing desktop layout on cloned element for PDF render...");
                            // Paksa gaya layout desktop pada elemen kloningan
                            containerClone.style.width = `${DESKTOP_WIDTH_PX}px`;
                            containerClone.style.maxWidth = 'none'; // Abaikan max-width
                            containerClone.style.display = 'flex'; // Pastikan flexbox
                            containerClone.style.flexDirection = 'row'; // Pastikan kolom berdampingan

                            // Sembunyikan elemen yang tidak ingin dicetak di PDF
                            const linkContainerClone = documentClone.getElementById('download-pdf-link-container');
                            if (linkContainerClone) linkContainerClone.style.display = 'none';

                            const langSwitcherClone = documentClone.querySelector('.language-switcher');
                            if (langSwitcherClone) langSwitcherClone.style.display = 'none';

                            const mobileFooterClone = documentClone.querySelector('.mobile-footer');
                            if (mobileFooterClone) mobileFooterClone.style.display = 'none';

                            console.log("Elements hidden in cloned document.");
                        } else {
                            console.error("Could not find .resume-container in cloned document!");
                        }
                    }
                },
                // Konfigurasi jsPDF
                jsPDF: {
                    unit: 'in', // Satuan: inci
                    format: 'a4', // Ukuran kertas
                    orientation: 'portrait' // Orientasi potret
                }
            };

            // Ukuran QR Code yang diinginkan dalam PDF (inci)
            const qrWidthInPdf = 0.9;
            const qrHeightInPdf = 0.9;

            console.log("Starting html2canvas with forced width:", DESKTOP_WIDTH_PX);
            // Mulai proses rendering HTML ke canvas
            html2canvas(elementToCapture, options.html2canvas).then(canvas => {
                console.log("html2canvas finished. Generating PDF...");
                const imgData = canvas.toDataURL(options.image.type, options.image.quality); // Data gambar dari canvas
                const pdf = new jspdf.jsPDF(options.jsPDF); // Buat instance jsPDF

                // Dapatkan dimensi halaman PDF (inci)
                const pdfPageWidth = pdf.internal.pageSize.getWidth();
                const pdfPageHeight = pdf.internal.pageSize.getHeight();
                const contentMargin = options.margin;
                // Lebar area yang bisa dipakai untuk konten (setelah dikurangi margin)
                const contentWidthPdf = pdfPageWidth - (contentMargin * 2);

                // Hitung lebar virtual sidebar di PDF berdasarkan rasio
                const sidebarWidthPdf = contentWidthPdf * SIDEBAR_WIDTH_RATIO;

                // Hitung posisi X untuk QR Code (tengah horizontal di area sidebar virtual)
                // Margin kiri + setengah lebar sidebar - setengah lebar QR
                const desiredQrX = contentMargin + (sidebarWidthPdf / 2) - (qrWidthInPdf / 2);

                // Hitung posisi Y untuk QR Code (di bawah, dengan jarak dari tepi bawah)
                // Tinggi halaman - tinggi QR - margin bawah - jarak tambahan dari bawah
                const bottomPadding = 0.8; // Jarak dari batas margin bawah (sesuaikan jika perlu)
                const desiredQrY = pdfPageHeight - qrHeightInPdf - contentMargin - bottomPadding;

                // --- Logika Pagination untuk Konten Utama ---
                 const imgProps = pdf.getImageProperties(imgData); // Dapatkan properti gambar hasil render
                 // Hitung tinggi konten yang dirender agar proporsional dengan lebar area konten PDF
                 const contentHeightPdf = (imgProps.height * contentWidthPdf) / imgProps.width;

                 let heightLeft = contentHeightPdf; // Tinggi total konten yang tersisa
                 let positionY = contentMargin; // Posisi Y awal untuk gambar konten
                 let currentPage = 1; // Halaman saat ini

                 console.log(`Adding page ${currentPage}... Total content height: ${contentHeightPdf.toFixed(2)}in`);
                 // Tambahkan gambar konten ke halaman pertama
                 pdf.addImage(imgData, options.image.type, contentMargin, positionY, contentWidthPdf, contentHeightPdf);
                 // Hitung tinggi area yang bisa dipakai per halaman (setelah dikurangi margin atas & bawah)
                 const usablePageHeight = pdfPageHeight - (2 * contentMargin);
                 heightLeft -= usablePageHeight; // Kurangi tinggi yang sudah dipakai

                 // Tambahkan halaman baru jika konten masih tersisa
                 while (heightLeft > 0) {
                     currentPage++;
                     console.log(`Adding page ${currentPage}... Height left: ${heightLeft.toFixed(2)}in`);
                     // Hitung posisi Y negatif untuk 'memotong' bagian gambar berikutnya
                     positionY = -(usablePageHeight * (currentPage - 1)) + contentMargin;
                     pdf.addPage(); // Tambah halaman baru
                     // Tambahkan potongan gambar konten berikutnya
                     pdf.addImage(imgData, options.image.type, contentMargin, positionY, contentWidthPdf, contentHeightPdf);
                     heightLeft -= usablePageHeight; // Kurangi lagi tinggi yang dipakai
                 }
                // --- Akhir Pagination ---

                // --- Tambahkan QR Code ke Halaman Pertama ---
                console.log("Adding QR Code to page 1...");
                pdf.setPage(1); // Pindah fokus ke halaman pertama

                try {
                    // Coba deteksi tipe gambar QR dari src (harapannya PNG atau JPG/JPEG)
                    let qrImageType = 'PNG'; // Default ke PNG
                    const qrSrcLower = qrImageElement.src.toLowerCase();
                    if (qrSrcLower.endsWith('.jpg') || qrSrcLower.endsWith('.jpeg')) {
                        qrImageType = 'JPEG';
                    } else if (!qrSrcLower.endsWith('.png')) {
                         console.warn("QR Code image type might not be PNG or JPEG, defaulting to PNG.");
                    }

                    console.log(`Attempting to add QR Image (${qrImageType}) at X:${desiredQrX.toFixed(2)}, Y:${desiredQrY.toFixed(2)}`);
                    // Tambahkan gambar QR code dari elemen <img> tersembunyi
                    pdf.addImage(qrImageElement, qrImageType, desiredQrX, desiredQrY, qrWidthInPdf, qrHeightInPdf);
                    console.log("QR Code added successfully.");
                } catch (e) {
                    console.error("Error adding QR code image to PDF:", e);
                    // Mungkin terjadi jika gambar QR belum termuat atau format tidak didukung jsPDF
                    alert("Error adding QR code. Please ensure the QR image is loaded correctly.");
                }
                // --- Selesai Tambah QR Code ---

                console.log(`Saving PDF: ${options.filename}`);
                // Simpan file PDF dan picu unduhan
                pdf.save(options.filename);

            }).catch(error => {
                console.error("Error during html2canvas or PDF generation:", error);
                alert("Failed to generate PDF. Please check the console for details."); // Pesan error ke pengguna
            }).finally(() => {
                // Kembalikan teks tombol dan aktifkan kembali, baik sukses maupun gagal
                 if(originalButtonTextSpan) {
                     originalButtonTextSpan.textContent = originalButtonText;
                 } else {
                     generatePdfBtn.textContent = originalButtonText;
                 }
                 generatePdfBtn.style.pointerEvents = 'auto'; // Aktifkan kembali klik
                 console.log("PDF generation process finished.");
            });
        });
    } else {
        // Beri peringatan jika elemen penting tidak ditemukan saat halaman dimuat
        console.warn("Required elements for PDF generation were not found on the page (check IDs: generate-pdf-btn, qrCodeForPdf, download-pdf-link-container and class: resume-container).");
    }
}); // Akhir event listener DOMContentLoaded
