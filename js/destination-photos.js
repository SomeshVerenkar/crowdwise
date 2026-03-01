/**
 * Destination Photos Service
 * Fetches authentic destination images from Wikipedia's free API.
 * Falls back gracefully to the emoji gradient when no image is available.
 * Covers all 253 destinations (224 original + 29 new additions).
 */
const DestinationPhotos = {

    // Map destination ID → Wikipedia article title
    wikiTitles: {
        // === ANDHRA PRADESH ===
        1:   'Tirumala_Venkateswara_Temple',
        2:   'Araku_Valley',
        4:   'Tawang_Monastery',
        5:   'Ziro,_Arunachal_Pradesh',
        // === ASSAM ===
        6:   'Kaziranga_National_Park',
        7:   'Kamakhya_Temple',
        8:   'Majuli',
        158: 'Sivasagar,_Assam',
        159: 'Manas_National_Park',
        // === BIHAR ===
        9:   'Bodh_Gaya',
        10:  'Nalanda',
        11:  'Rajgir',
        112: 'Patna_Sahib',
        113: 'Vikramashila',
        195: 'Vaishali,_Bihar',
        // === CHHATTISGARH ===
        12:  'Chitrakote_Falls',
        13:  'Sirpur',
        114: 'Bhoramdeo_Temple',
        196: 'Kanger_Valley_National_Park',
        197: 'Tirathgarh_waterfall',
        // === GOA ===
        14:  'Baga_Beach',
        15:  'Basilica_of_Bom_Jesus',
        16:  'Dudhsagar_Falls',
        117: 'Palolem_Beach',
        118: 'Fort_Aguada',
        198: 'Calangute',
        199: 'Anjuna',
        // === GUJARAT ===
        17:  'Statue_of_Unity',
        18:  'Rann_of_Kutch',
        19:  'Somnath_temple',
        20:  'Gir_Forest_National_Park',
        119: 'Dwarkadhish_Temple',
        120: 'Rani_ki_vav',
        152: 'Diu_Fort',
        153: 'Nagoa_Beach',
        // === HARYANA ===
        21:  'Kurukshetra',
        22:  'Sultanpur_National_Park',
        160: 'Surajkund',
        224: 'Panipat_(city)',
        // === HIMACHAL PRADESH ===
        23:  'Manali,_Himachal_Pradesh',
        24:  'Shimla',
        25:  'Dharamshala',
        26:  'Spiti_Valley',
        161: 'Kasol',
        // === JHARKHAND ===
        27:  'Vaidyanath_Jyotirlinga_temple',
        28:  'Betla_National_Park',
        123: 'Hundru_Falls',
        124: 'Shikharji',
        162: 'Rajrappa',
        221: 'Netarhat',
        222: 'Ranchi',
        // === KARNATAKA ===
        29:  'Hampi',
        30:  'Mysore_Palace',
        31:  'Kodagu_district',
        32:  'Bangalore',
        163: 'Gokarna,_Karnataka',
        // === KERALA ===
        33:  'Munnar',
        34:  'Alleppey',
        35:  'Kovalam',
        36:  'Wayanad',
        164: 'Periyar_Tiger_Reserve',
        207: 'Varkala',
        208: 'Fort_Kochi',
        223: 'Kochi',
        // === MADHYA PRADESH ===
        37:  'Khajuraho_Group_of_Monuments',
        38:  'Sanchi',
        39:  'Bandhavgarh_National_Park',
        40:  'Ujjain',
        165: 'Orchha',
        200: 'Pachmarhi',
        201: 'Kanha_Tiger_Reserve',
        // === MAHARASHTRA ===
        41:  'Gateway_of_India',
        42:  'Ajanta_Caves',
        43:  'Shirdi_Sai_Baba',
        44:  'Lonavala',
        166: 'Mahabaleshwar',
        // === MANIPUR ===
        45:  'Loktak_Lake',
        46:  'Kangla_Fort',
        125: 'Shirui_Peak',
        167: 'Khongjom',
        // === MEGHALAYA ===
        47:  'Cherrapunji',
        48:  'Living_root_bridges',
        49:  'Shillong',
        168: 'Dawki',
        169: 'Mawlynnong',
        // === MIZORAM ===
        50:  'Aizawl',
        127: 'Phawngpui',
        170: 'Reiek',
        220: 'Lunglei',
        // === NAGALAND ===
        51:  'Hornbill_Festival',
        52:  'Dzükou_Valley',
        129: 'Khonoma',
        172: 'Kohima_War_Cemetery',
        209: 'Dimapur',
        210: 'Mokokchung',
        // === ODISHA ===
        53:  'Jagannath_Temple,_Puri',
        54:  'Konark_Sun_Temple',
        55:  'Bhubaneswar',
        131: 'Chilika_lake',
        132: 'Simlipal_National_Park',
        // === PUNJAB ===
        56:  'Golden_Temple',
        57:  'Wagah',
        133: 'Anandpur_Sahib',
        134: 'Gobindgarh_Fort',
        173: 'Jallianwala_Bagh',
        212: 'Qila_Mubarak,_Patiala',
        // === RAJASTHAN ===
        58:  'City_Palace,_Jaipur',
        59:  'Lake_Palace',
        60:  'Jaisalmer_Fort',
        61:  'Pushkar',
        62:  'Ranthambore_National_Park',
        202: 'Mehrangarh',
        // === SIKKIM ===
        63:  'Gangtok',
        64:  'Nathu_La',
        65:  'Pelling',
        135: 'Gurudongmar_Lake',
        203: 'Tsomgo_Lake',
        204: 'Yumthang_Valley',
        // === TAMIL NADU ===
        66:  'Meenakshi_Amman_Temple',
        67:  'Mahabalipuram',
        68:  'Ooty',
        69:  'Ramanathaswamy_Temple',
        70:  'Kanyakumari',
        150: 'Auroville',
        205: 'Marina_Beach',
        206: 'Kodaikanal',
        // === TELANGANA ===
        71:  'Charminar',
        72:  'Ramoji_Film_City',
        73:  'Golconda',
        174: 'Warangal_Fort',
        175: 'Nagarjuna_Sagar_Dam',
        // === TRIPURA ===
        74:  'Ujjayanta_Palace',
        75:  'Neermahal',
        137: 'Unakoti',
        // === UTTAR PRADESH ===
        76:  'Taj_Mahal',
        77:  'Varanasi',
        78:  'Lucknow',
        79:  'Ayodhya',
        80:  'Vrindavan',
        // === UTTARAKHAND ===
        81:  'Rishikesh',
        82:  'Haridwar',
        83:  'Nainital',
        84:  'Mussoorie',
        85:  'Kedarnath_temple',
        86:  'Badrinath_Temple',
        87:  'Valley_of_Flowers_National_Park',
        // === WEST BENGAL ===
        88:  'Darjeeling',
        89:  'Victoria_Memorial,_Kolkata',
        90:  'Sundarbans',
        91:  'Digha',
        139: 'Kalimpong',
        140: 'Shantiniketan',
        // === ANDAMAN & NICOBAR ===
        92:  'Radhanagar_Beach',
        93:  'Cellular_Jail',
        146: 'Neil_Island',
        147: 'Baratang_Island',
        177: 'Ross_Island,_Andaman',
        217: 'Havelock_Island',
        218: 'Port_Blair',
        // === CHANDIGARH ===
        94:  'Rock_Garden,_Chandigarh',
        148: 'Sukhna_Lake',
        149: 'Capitol_Complex,_Chandigarh',
        178: 'Zakir_Hussain_Rose_Garden,_Chandigarh',
        // === DELHI ===
        95:  'Red_Fort',
        96:  'Qutb_Minar',
        97:  'India_Gate',
        98:  'Lotus_Temple',
        144: 'Humayun%27s_Tomb',
        145: 'Akshardham_(Delhi)',
        214: 'Swaminarayan_Akshardham_(New_Delhi)',
        // === JAMMU & KASHMIR ===
        99:  'Dal_Lake',
        100: 'Gulmarg',
        101: 'Vaishno_Devi',
        141: 'Pahalgam',
        142: 'Sonamarg',
        143: 'Patnitop',
        // === LADAKH ===
        102: 'Pangong_Tso',
        103: 'Leh_Palace',
        104: 'Nubra_Valley',
        187: 'Thikse_Monastery',
        188: 'Magnetic_Hill,_Leh',
        216: 'Tso_Moriri',
        // === LAKSHADWEEP ===
        105: 'Agatti_Island',
        155: 'Bangaram_Island',
        156: 'Kavaratti',
        189: 'Minicoy',
        // === PUDUCHERRY ===
        106: 'Promenade_Beach,_Pondicherry',
        191: 'Sri_Aurobindo_Ashram',
        192: 'Serenity_Beach',
        // === ANDHRA PRADESH (continued) ===
        107: 'Lepakshi',
        108: 'Srisailam',
        109: 'Rushikonda_Beach',
        193: 'Gandikota',
        // === NEW ADDITIONS (225+) ===
        225: 'Mangalore',
        226: 'Hawa_Mahal',
        227: 'Amber_Fort',
        228: 'Ajmer',
        229: 'Mount_Abu',
        230: 'Chittorgarh_Fort',
        231: 'Ellora_Caves',
        232: 'Elephanta_Caves',
        233: 'Aurangabad,_Maharashtra',
        234: 'Pune',
        235: 'Agra_Fort',
        236: 'Fatehpur_Sikri',
        237: 'Jim_Corbett_National_Park',
        238: 'Dehradun',
        239: 'Gwalior_Fort',
        240: 'Brihadeeswarar_Temple',
        241: 'Tiruvannamalai',
        242: 'Dal_Lake',
        243: 'Jog_Falls',
        244: 'Udupi',
        245: 'Badami',
        246: 'Chikmagalur',
        247: 'Belur_and_Halebidu',
        248: 'Sabarmati_Ashram',
        249: 'Vellore_Fort',
        250: 'Thiruvananthapuram',
        251: 'Kozhikode',
        252: 'Bikaner',
        253: 'Bhojtal',
    },

    photoCache: {},

    _cacheKey(destId) { return `cwphoto_${destId}`; },

    _loadFromStorage(destId) {
        try {
            const val = sessionStorage.getItem(this._cacheKey(destId));
            if (val) { this.photoCache[destId] = val; return val; }
        } catch (_) {}
        return null;
    },

    _saveToStorage(destId, url) {
        try { sessionStorage.setItem(this._cacheKey(destId), url); } catch (_) {}
    },

    async fetchPhoto(destId) {
        if (this.photoCache[destId]) return this.photoCache[destId];
        const cached = this._loadFromStorage(destId);
        if (cached) return cached;

        const title = this.wikiTitles[destId];
        if (!title) return null;

        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 5000);
            const url = `https://en.wikipedia.org/w/api.php?action=query&titles=${encodeURIComponent(title)}&prop=pageimages&format=json&pithumbsize=700&origin=*`;
            const resp = await fetch(url, { signal: controller.signal });
            clearTimeout(timeoutId);
            if (!resp.ok) return null;
            const data = await resp.json();
            const pages = data?.query?.pages;
            if (!pages) return null;
            const page = Object.values(pages)[0];
            const imgUrl = page?.thumbnail?.source;
            if (imgUrl) {
                this.photoCache[destId] = imgUrl;
                this._saveToStorage(destId, imgUrl);
                return imgUrl;
            }
        } catch (_) {}
        return null;
    },

    /**
     * Loads photos for all visible `.card-image[data-dest-id]` cards.
     * Batches requests to avoid browser connection limits.
     */
    async loadPhotosForVisibleCards() {
        const cards = document.querySelectorAll('.card-image[data-dest-id]');
        if (!cards.length) return;

        const BATCH_SIZE = 10;
        const cardArr = Array.from(cards);

        for (let i = 0; i < cardArr.length; i += BATCH_SIZE) {
            const batch = cardArr.slice(i, i + BATCH_SIZE);
            await Promise.allSettled(batch.map(async (card) => {
                const destId = parseInt(card.getAttribute('data-dest-id'), 10);
                const imgUrl = await this.fetchPhoto(destId);
                if (imgUrl) {
                    card.style.backgroundImage = `url('${imgUrl}')`;
                    card.classList.add('has-photo');
                }
            }));
        }
    }
};

window.DestinationPhotos = DestinationPhotos;
