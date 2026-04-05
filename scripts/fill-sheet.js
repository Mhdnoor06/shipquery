const { google } = require('googleapis');
require('dotenv').config();

async function main() {
  const auth = new google.auth.GoogleAuth({
    keyFile: './google-credentials.json',
    scopes: ['https://www.googleapis.com/auth/spreadsheets']
  });

  const sheets = google.sheets({ version: 'v4', auth });
  const sheetId = process.env.GOOGLE_SHEET_ID;

  const headers = [
    'Job Ref', 'Date', 'Customer', 'Shipper', 'MBL Number',
    'Carrier', 'Origin', 'Destination', 'Pieces', 'Weight (KG)',
    'Freight Cost', 'Currency', 'Status', 'Notes'
  ];

  const data = [
    ['05936/26-03', '2026-04-01', 'Paper Home Company', 'Maxdura International', '157-08290251',
     'Qatar Airways', 'Taoyuan (TPE)', 'Riyadh (RUH)', '58', '292',
     '6697.31', 'SAR', 'Delivered', 'Die cutting anvil covers'],

    ['05940/26-04', '2026-04-03', 'Saudi Steel Corp', 'Nippon Steel Trading', '180-44521098',
     'Emirates', 'Tokyo (NRT)', 'Jeddah (JED)', '120', '1850',
     '28500.00', 'SAR', 'In Transit', 'Steel reinforcement bars'],

    ['05941/26-04', '2026-04-03', 'Paper Home Company', 'Maxdura International', '157-08290388',
     'Qatar Airways', 'Taoyuan (TPE)', 'Riyadh (RUH)', '42', '210',
     '4830.00', 'SAR', 'Customs Clearance', 'Die cutting machine parts'],

    ['05942/26-04', '2026-04-04', 'Gulf Pharma Ltd', 'Roche Logistics', '020-55128734',
     'Lufthansa Cargo', 'Frankfurt (FRA)', 'Riyadh (RUH)', '15', '85',
     '12750.00', 'SAR', 'Booked', 'Temperature controlled medicines'],

    ['05943/26-04', '2026-04-04', 'Al Rajhi Electronics', 'Foxconn Shipping', '618-77209153',
     'Singapore Airlines', 'Taipei (TPE)', 'Dammam (DMM)', '200', '450',
     '9800.00', 'SAR', 'In Transit', 'Electronic components PCB boards'],

    ['05944/26-04', '2026-04-05', 'Paper Home Company', 'Maxdura International', '157-08290455',
     'Qatar Airways', 'Taoyuan (TPE)', 'Riyadh (RUH)', '30', '175',
     '4025.00', 'SAR', 'Booked', 'Anvil cover replacement parts'],

    ['05945/26-04', '2026-04-05', 'Saudi Steel Corp', 'POSCO Trading', '180-44521200',
     'Korean Air Cargo', 'Seoul (ICN)', 'Jeddah (JED)', '80', '2200',
     '35200.00', 'SAR', 'Booked', 'Hot rolled steel coils'],

    ['05946/26-04', '2026-04-05', 'Gulf Pharma Ltd', 'Pfizer Export', '020-55128800',
     'Turkish Airlines', 'New York (JFK)', 'Riyadh (RUH)', '25', '120',
     '18500.00', 'SAR', 'Documentation', 'Vaccine shipment - cold chain required'],
  ];

  console.log('Writing data to Google Sheet...');
  await sheets.spreadsheets.values.update({
    spreadsheetId: sheetId,
    range: 'Sheet1!A1',
    valueInputOption: 'RAW',
    requestBody: {
      values: [headers, ...data]
    }
  });

  console.log(`Done! Added ${data.length} shipment records.`);
  console.log(`View: https://docs.google.com/spreadsheets/d/${sheetId}/edit`);
}

main().catch(console.error);
