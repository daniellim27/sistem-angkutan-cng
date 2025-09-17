4. OCR-Based Billing Calculation
This new module replaces the IoT system for billing metrics. The process is designed to take raw data from the driver's uploaded nota and calculate the final billable gas volume using the client's specified formula.
4.1. OCR Data Extraction
The OCR service will parse the nota image to extract the following fields, which correspond to the client's Excel sheet format:


Field Name (from Rundown)
Corresponding Excel Column
Data Type
Description


tanggal_mulai / selesai
TANGGAL / JAM
Datetime
Start/end date and time of delivery.


stan_awal
Stand Meter Awal
Numeric
The initial reading from the gas meter.


stan_akhir
Stand Meter Akhir
Numeric
The final reading from the gas meter.


tekanan_operasi
Tekanan (Bar)
Numeric
The operational pressure in Bar.


temperatur_operasi
Suhu (C)
Numeric
The operational temperature in Celsius.


harga_satuan
(N/A)
Numeric
Price per unit (e.g., per m³).


harga_invoice / total_harga
(N/A)
Numeric
Final calculated price for the invoice.

4.2. Billing Formula (From PowerPoint)
The final volume of gas delivered (V) is calculated by converting the meter reading difference to standard conditions (27°C and 1 atm) using the following formula:
V = Vt x ((1.01325 + p) / 1.01325) x (300 / (273 + t)) x k


Variable Definitions:
Variable
Description
How It's Derived from OCR Data
V
Volume Gas (m³)
The final calculated volume for billing. This corresponds to the Pemakaian (m3) column.
Vt
Volume from Meter (m³)
The difference in meter readings. Vt = stan_akhir - stan_awal. This corresponds to the Selisih column.
p
Gas Pressure (Bar)
The operational pressure. p = tekanan_operasi.
t
Gas Temperature (°C)
The operational temperature. t = temperatur_operasi.
k
Super Compressibility Factor
A correction factor. Corresponds to the Faktor Koreksi column. This is calculated based on pressure: <br> • If p < 4 bar, k = 1 + (0.0002 * p) <br> • If p >= 4 bar, k = [FPV]² (per A.G.A Report NX-19)

The backend will implement this formula in a dedicated service. After the OCR provides the raw p and t values and the Vt is calculated, the service will compute k and then the final billable volume V.
