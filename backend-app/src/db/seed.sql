-- ============================================================
-- Lokatani Smart Hydroponics — Seed Data
-- Populates pest master data and DSS mitigation actions.
-- ============================================================

-- ==================== PEST MASTER DATA ====================

INSERT INTO tb_hama (nama_hama, deskripsi, gejala) VALUES
('kutu_daun', 'Kutu daun (Aphid) - hama penghisap cairan tanaman yang umum pada tanaman hidroponik.',
 'Daun menguning, mengkerut, dan terdapat koloni serangga kecil berwarna hijau/hitam di bawah daun.'),

('ulat_grayak', 'Ulat grayak (Spodoptera litura) - larva ngengat yang memakan daun tanaman secara agresif.',
 'Lubang-lubang besar pada daun, bekas gigitan tidak beraturan, kotoran ulat pada permukaan daun.'),

('kutu_kebul', 'Kutu kebul / Whitefly (Bemisia tabaci) - hama kecil bersayap putih penghisap cairan tanaman.',
 'Daun menguning dari bawah, terdapat serangga kecil putih yang beterbangan saat daun digoyang.'),

('thrips', 'Thrips (Thrips tabaci) - serangga kecil yang merusak jaringan daun dan bunga.',
 'Bercak keperakan pada daun, daun menggulung, pertumbuhan tanaman terhambat.'),

('tungau', 'Tungau / Spider mite (Tetranychus urticae) - hama mikroskopis yang membuat jaring halus pada daun.',
 'Bintik-bintik kuning pada daun, jaring halus di bawah daun, daun mengering dan rontok.'),

('belalang', 'Belalang (Locusta migratoria) - serangga pemakan daun berukuran besar.',
 'Daun terpotong-potong dengan pola gigitan dari tepi, kerusakan cepat dan masif pada daun muda.'),

('winged_aphid', 'Kutu daun bersayap (Winged Aphid) - fase dewasa kutu daun yang memiliki kemampuan terbang untuk menyebar.',
 'Terdapat serangga kecil bersayap pada daun, mirip kutu daun biasa namun memiliki sayap transparan.'),

('kutu_putih', 'Kutu putih (Mealybug) - hama penghisap cairan tanaman yang tubuhnya diselimuti lapisan lilin putih.',
 'Bercak putih seperti kapas pada batang atau ketiak daun, pertumbuhan tanaman terhambat dan daun menguning.')
ON CONFLICT (nama_hama) DO NOTHING;


-- ==================== DSS MITIGATION ACTIONS ====================

-- --- Kutu Daun ---
INSERT INTO tb_penanganan (hama_id, jenis, deskripsi, bahan, instruksi) VALUES
((SELECT id FROM tb_hama WHERE nama_hama = 'kutu_daun'), 'preventif',
 'Pemasangan yellow sticky trap untuk monitoring populasi kutu daun.',
 'Yellow sticky trap, tiang penyangga',
 'Pasang yellow sticky trap di sekitar tanaman dengan ketinggian sejajar kanopi. Ganti setiap 2 minggu atau saat sudah penuh.'),

((SELECT id FROM tb_hama WHERE nama_hama = 'kutu_daun'), 'preventif',
 'Penyemprotan larutan neem oil secara berkala sebagai repelen alami.',
 'Neem oil 5ml, air 1 liter, sabun cair 2 tetes',
 'Campurkan neem oil dengan air dan sabun cair. Semprotkan ke seluruh permukaan daun (atas dan bawah) setiap 7 hari.'),

((SELECT id FROM tb_hama WHERE nama_hama = 'kutu_daun'), 'kuratif',
 'Penyemprotan insektisida nabati berbahan dasar bawang putih dan cabai.',
 'Bawang putih 100g, cabai rawit 50g, air 1 liter, sabun cair 5 tetes',
 'Haluskan bawang putih dan cabai, rendam dalam air selama 24 jam. Saring dan tambahkan sabun cair. Semprotkan langsung ke koloni kutu daun.');

-- --- Ulat Grayak ---
INSERT INTO tb_penanganan (hama_id, jenis, deskripsi, bahan, instruksi) VALUES
((SELECT id FROM tb_hama WHERE nama_hama = 'ulat_grayak'), 'preventif',
 'Pemasangan jaring anti-serangga (insect net) pada area budidaya.',
 'Insect net mesh 40-50, rangka penyangga',
 'Pasang insect net menutupi seluruh area budidaya hidroponik. Pastikan tidak ada celah yang bisa dimasuki ngengat dewasa.'),

((SELECT id FROM tb_hama WHERE nama_hama = 'ulat_grayak'), 'kuratif',
 'Pengambilan ulat secara manual dan aplikasi Bacillus thuringiensis (Bt).',
 'Sarung tangan, pinset, Bacillus thuringiensis (Bt) 2g/liter',
 'Ambil ulat yang terlihat secara manual. Larutkan Bt dalam air dan semprotkan ke seluruh daun, terutama bagian bawah. Ulangi setiap 5-7 hari.'),

((SELECT id FROM tb_hama WHERE nama_hama = 'ulat_grayak'), 'kuratif',
 'Pemasangan light trap untuk menangkap ngengat dewasa di malam hari.',
 'Lampu UV/neon, wadah berisi air sabun',
 'Pasang lampu di atas wadah berisi air sabun pada malam hari. Ngengat dewasa akan tertarik cahaya dan jatuh ke air sabun.');

-- --- Kutu Kebul ---
INSERT INTO tb_penanganan (hama_id, jenis, deskripsi, bahan, instruksi) VALUES
((SELECT id FROM tb_hama WHERE nama_hama = 'kutu_kebul'), 'preventif',
 'Pemasangan yellow sticky trap dan menjaga sirkulasi udara yang baik.',
 'Yellow sticky trap, kipas sirkulasi',
 'Pasang yellow sticky trap setiap 2 meter. Pastikan sirkulasi udara lancar untuk mengurangi kelembaban berlebih.'),

((SELECT id FROM tb_hama WHERE nama_hama = 'kutu_kebul'), 'kuratif',
 'Penyemprotan larutan sabun insektisida untuk membunuh nimfa dan dewasa.',
 'Sabun cuci piring 10ml, minyak sayur 5ml, air 1 liter',
 'Campurkan sabun dan minyak sayur ke dalam air. Semprotkan ke bagian bawah daun tempat kutu kebul berkumpul. Ulangi setiap 3-4 hari.');

-- --- Thrips ---
INSERT INTO tb_penanganan (hama_id, jenis, deskripsi, bahan, instruksi) VALUES
((SELECT id FROM tb_hama WHERE nama_hama = 'thrips'), 'preventif',
 'Pemasangan blue sticky trap dan monitoring rutin permukaan daun.',
 'Blue sticky trap, kaca pembesar',
 'Pasang blue sticky trap (thrips lebih tertarik warna biru). Periksa permukaan daun secara rutin dengan kaca pembesar.'),

((SELECT id FROM tb_hama WHERE nama_hama = 'thrips'), 'kuratif',
 'Aplikasi spinosad atau insektisida nabati berbahan neem oil konsentrasi tinggi.',
 'Spinosad 1ml/liter atau neem oil 10ml/liter, air',
 'Semprotkan larutan spinosad atau neem oil ke seluruh tanaman, fokus pada tunas muda dan bunga. Ulangi setiap 5 hari selama 3 minggu.');

-- --- Tungau ---
INSERT INTO tb_penanganan (hama_id, jenis, deskripsi, bahan, instruksi) VALUES
((SELECT id FROM tb_hama WHERE nama_hama = 'tungau'), 'preventif',
 'Menjaga kelembaban udara tinggi (>60%) dan penyemprotan air secara berkala.',
 'Sprayer, air bersih, hygrometer',
 'Tungau berkembang di kondisi kering. Semprotkan air halus ke daun 2-3 kali sehari. Monitor kelembaban dengan hygrometer.'),

((SELECT id FROM tb_hama WHERE nama_hama = 'tungau'), 'kuratif',
 'Penyemprotan akarisida nabati atau larutan belerang.',
 'Belerang mikro 3g/liter atau akarisida nabati, air',
 'Semprotkan larutan belerang ke seluruh permukaan daun, terutama bagian bawah. Ulangi setiap 7 hari. Hindari aplikasi saat suhu di atas 35°C.');

-- --- Belalang ---
INSERT INTO tb_penanganan (hama_id, jenis, deskripsi, bahan, instruksi) VALUES
((SELECT id FROM tb_hama WHERE nama_hama = 'belalang'), 'preventif',
 'Pemasangan jaring pelindung fisik dan pembersihan gulma di sekitar area budidaya.',
 'Jaring anti-serangga, alat pemotong rumput',
 'Pasang jaring fisik di sekeliling area budidaya. Bersihkan gulma dan rumput liar yang menjadi tempat bersembunyi belalang.'),

((SELECT id FROM tb_hama WHERE nama_hama = 'belalang'), 'kuratif',
 'Penangkapan manual dan penggunaan umpan beracun (bila populasi tinggi).',
 'Sarung tangan, jaring tangkap, umpan dedak + insektisida (opsional)',
 'Tangkap belalang secara manual saat pagi hari (kurang aktif). Untuk populasi tinggi, sebarkan umpan dedak yang dicampur insektisida di sekeliling area.');

-- --- Winged Aphid ---
INSERT INTO tb_penanganan (hama_id, jenis, deskripsi, bahan, instruksi) VALUES
((SELECT id FROM tb_hama WHERE nama_hama = 'winged_aphid'), 'preventif',
 'Pemasangan yellow sticky trap gantung untuk menangkap serangga terbang.',
 'Yellow sticky trap, tali penggantung',
 'Gantungkan yellow sticky trap di sekitar jendela atau ventilasi greenhouse untuk menangkap winged aphid sebelum hinggap.'),

((SELECT id FROM tb_hama WHERE nama_hama = 'winged_aphid'), 'kuratif',
 'Penyemprotan larutan sabun kalium (potassium soap) untuk merusak lapisan tubuh serangga.',
 'Sabun kalium 10ml, air 1 liter',
 'Campurkan sabun kalium dengan air. Semprotkan secara merata pada tanaman yang terserang pada sore hari.');

-- --- Kutu Putih ---
INSERT INTO tb_penanganan (hama_id, jenis, deskripsi, bahan, instruksi) VALUES
((SELECT id FROM tb_hama WHERE nama_hama = 'kutu_putih'), 'preventif',
 'Menjaga kebersihan area sekitar instalasi dan memastikan sirkulasi udara baik.',
 'Alat kebersihan',
 'Pastikan jarak antar tanaman tidak terlalu rapat. Bersihkan gulma di sekitar instalasi hidroponik yang bisa menjadi inang.'),

((SELECT id FROM tb_hama WHERE nama_hama = 'kutu_putih'), 'kuratif',
 'Pengusapan dengan alkohol 70% pada koloni yang masih sedikit.',
 'Kapas/cotton bud, alkohol 70%',
 'Celupkan cotton bud ke dalam alkohol 70%, lalu usapkan langsung pada kumpulan kutu putih hingga terlepas dari tanaman.');
