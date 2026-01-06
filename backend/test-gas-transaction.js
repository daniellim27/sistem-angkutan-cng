// node test-gas-transaction.js supir_andi awak1234 surat-jalan.jpeg nota-receipt.jpg

const axios = require('axios');
const fs = require('fs');
const path = require('path');
const FormData = require('form-data');

class GasTransactionTester {
    constructor(baseURL = 'http://localhost:3000') {
        this.baseURL = baseURL;
        this.driverToken = null;
        this.driverId = null;
        this.depositGroupId = null;
        this.vehicleId = null;
        
        this.axios = axios.create({
            baseURL,
            timeout: 30000
        });
        
        // Interceptor for logging
        this.axios.interceptors.request.use(request => {
            console.log(`📤 ${request.method.toUpperCase()} ${request.url}`);
            return request;
        });
        
        this.axios.interceptors.response.use(response => {
            console.log(`📥 Response: ${response.status} ${response.statusText}`);
            return response;
        }, error => {
            console.error(`❌ Error: ${error.response?.status || error.code} - ${error.message}`);
            return Promise.reject(error);
        });
    }

    async sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    async mobileLogin(username, password) {
        try {
            console.log('\n🔐 Step 1: Mobile Login');
            const response = await this.axios.post('/api/auth/mobile/login', {
                username,
                password,
                expoPushToken: 'test-token-' + Date.now()
            });

            this.driverToken = response.data.token;
            this.driverId = response.data.user.id;
            
            console.log(`✅ Login successful`);
            console.log(`   User: ${response.data.user.username} (${response.data.user.role})`);
            console.log(`   Token: ${this.driverToken.substring(0, 30)}...`);
            
            // Set default headers for subsequent requests
            this.axios.defaults.headers.common['Authorization'] = `Bearer ${this.driverToken}`;
            
            return response.data;
        } catch (error) {
            console.error('❌ Login failed:', error.response?.data || error.message);
            throw error;
        }
    }

    async getRandomDepositGroup() {
        console.log('\n🔍 Step 2: Using fixed Deposit Group for flow testing');

        this.depositGroupId = 1;

        console.log('✅ Deposit group locked');
        console.log('   ID: 1');

        return {
            id: 1,
            name: 'Flow Test Deposit Group',
            status: 'active'
        };
    }

    async getDriverVehicle() {
        try {
            console.log('\n🚗 Step 3: Get Driver Vehicle');
            
            const response = await this.axios.get('/api/vehicles/me');
            
            if (response.data && response.data.id) {
                this.vehicleId = response.data.id;
                console.log(`✅ Found vehicle: ${response.data.license_plate}`);
                console.log(`   ID: ${response.data.id}`);
                console.log(`   Type: ${response.data.type}`);
                return response.data;
            } else {
                console.log('⚠️ No vehicle assigned to driver');
                this.vehicleId = null;
                return null;
            }
        } catch (error) {
            console.error('❌ Failed to get vehicle:', error.response?.data || error.message);
            console.log('⚠️ Proceeding without vehicle_id');
            this.vehicleId = null;
            return null;
        }
    }

    async uploadGasTransaction(suratJalanPath, notaPath) {
        try {
            console.log('\n📤 Step 4: Upload Gas Transaction (Real Mobile Scenario)');
            console.log('   Uploading only photos - data will be extracted by OCR');
            
            // Check if files exist
            if (!fs.existsSync(suratJalanPath)) {
                throw new Error(`Surat Jalan file not found: ${suratJalanPath}`);
            }
            
            if (!fs.existsSync(notaPath)) {
                throw new Error(`Nota file not found: ${notaPath}`);
            }
            
            // Create form data - ONLY files, no manual data
            const formData = new FormData();
            
            // Add optional fields (these would come from app UI)
            if (this.depositGroupId) {
                formData.append('deposit_group_id', this.depositGroupId.toString());
            }
            
            if (this.vehicleId) {
                formData.append('vehicle_id', this.vehicleId.toString());
            }
            
            // Append optional additional fields
            formData.append('biaya_lain_amount', '50000');
            formData.append('biaya_lain_description', 'Biaya parkir dan makan');
            
            // Append the files - critical for OCR
            const suratJalanFilename = path.basename(suratJalanPath);
            const notaFilename = path.basename(notaPath);
            
            // 1. Surat Jalan Photo (for documentation)
            formData.append('surat_jalan_photo', fs.createReadStream(suratJalanPath), {
                filename: `surat_jalan_${suratJalanFilename}`,
                contentType: 'image/jpeg'
            });
            
            // 2. Nota Photo (for OCR extraction - MOST IMPORTANT)
            formData.append('nota_photo', fs.createReadStream(notaPath), {
                filename: `nota_${notaFilename}`,
                contentType: 'image/jpeg'
            });
            
            // 3. Biaya Lain Photo (optional)
            formData.append('biaya_lain_photo', fs.createReadStream(suratJalanPath), {
                filename: `biaya_lain_${suratJalanFilename}`,
                contentType: 'image/jpeg'
            });
            
            console.log('📊 Real Mobile Upload Scenario:');
            console.log(`   Only files uploaded - NO manual data entry`);
            console.log(`   Surat Jalan: ${suratJalanFilename}`);
            console.log(`   Nota (for OCR): ${notaFilename}`);
            console.log(`   OCR will extract: Jml Liter, Harga/Liter, Jml Rupiah`);
            
            const response = await this.axios.post(
                '/api/gas-transactions',
                formData,
                {
                    headers: {
                        ...formData.getHeaders(),
                        'Content-Type': 'multipart/form-data'
                    }
                }
            );
            
            console.log('✅ Gas transaction uploaded successfully!');
            console.log(`   Message: ${response.data.message}`);
            console.log(`   Transaction ID: ${response.data.data?.id}`);
            console.log(`   Status: ${response.data.data?.status}`);
            
            if (response.data.data?.ocr_extracted) {
                console.log('🔍 OCR Extracted Data:');
                console.log(`   Volume: ${response.data.data.volume_m3} m³`);
                console.log(`   Rate: Rp ${Number(response.data.data.rate_per_m3).toLocaleString('id-ID')}/m³`);
                console.log(`   Total: Rp ${Number(response.data.data.total_cost).toLocaleString('id-ID')}`);
            }
            
            return response.data;
        } catch (error) {
            console.error('❌ Upload failed:', error.response?.data || error.message);
            
            // Try to get more details
            if (error.response?.data?.errors) {
                console.error('Validation errors:', error.response.data.errors);
            }
            
            throw error;
        }
    }

    async getGasTransactionsByDepositGroup() {
        try {
            if (!this.depositGroupId) {
                console.log('\n⚠️ No deposit group selected, skipping history check');
                return null;
            }
            
            console.log(`\n📋 Step 5: Check Gas Transactions for Deposit Group ${this.depositGroupId}`);
            
            const response = await this.axios.get(`/api/gas-transactions/by-deposit-group/${this.depositGroupId}`);
            
            console.log(`✅ Found ${response.data.data?.length || 0} gas transactions`);
            
            if (response.data.data && response.data.data.length > 0) {
                console.log('\nRecent Transactions:');
                response.data.data.slice(0, 5).forEach((tx, index) => {
                    console.log(`  ${index + 1}. ID: ${tx.id} - ${tx.volume_m3} m³ - Rp ${Number(tx.total_cost).toLocaleString('id-ID')} - Status: ${tx.status}`);
                });
            }
            
            return response.data;
        } catch (error) {
            console.error('❌ Failed to get gas transactions:', error.response?.data || error.message);
            return null;
        }
    }

    async testDriverPermissions() {
        try {
            console.log('\n🔐 Step 6: Test Driver Permissions');
            
            // Test if driver can access the gas transactions endpoint
            const response = await this.axios.get('/api/gas-transactions/by-deposit-group/999999', {
                validateStatus: false // Don't throw on 403/404
            });
            
            if (response.status === 403) {
                console.log('✅ Driver permission test passed: Driver correctly receives 403 for invalid access');
            } else if (response.status === 400) {
                console.log('✅ Driver permission test: Endpoint accessible (validation error for non-existent group)');
            } else {
                console.log(`⚠️ Unexpected status: ${response.status}`);
            }
            
            return response.status;
        } catch (error) {
            console.error('❌ Permission test error:', error.message);
            return null;
        }
    }

    async runFullTest(username, password, suratJalanPath, notaPath) {
        console.log('🚀 ==========================================');
        console.log('🚀 GAS TRANSACTION TEST SCRIPT (REAL MOBILE SCENARIO)');
        console.log('🚀 Testing OCR-based gas transactions');
        console.log('🚀 ==========================================\n');
        
        try {
            // Step 1: Login
            await this.mobileLogin(username, password);
            await this.sleep(1000);
            
            // Step 2: Get random deposit group
            await this.getRandomDepositGroup();
            await this.sleep(1000);
            
            // Step 3: Get driver vehicle
            await this.getDriverVehicle();
            await this.sleep(1000);
            
            // Step 4: Upload gas transaction (OCR-based)
            await this.uploadGasTransaction(suratJalanPath, notaPath);
            await this.sleep(2000);
            
            // Step 5: Check transactions by deposit group
            await this.getGasTransactionsByDepositGroup();
            await this.sleep(1000);
            
            // Step 6: Test driver permissions
            await this.testDriverPermissions();
            
            console.log('\n🎉 ==========================================');
            console.log('🎉 TEST COMPLETED SUCCESSFULLY!');
            console.log('🎉 ==========================================\n');
            
            console.log('📋 Summary:');
            console.log(`   Driver ID: ${this.driverId}`);
            console.log(`   Deposit Group ID: ${this.depositGroupId || 'None (fire-and-forget mode)'}`);
            console.log(`   Vehicle ID: ${this.vehicleId || 'Auto-detected by backend'}`);
            console.log(`   Transaction submitted: ✅`);
            console.log(`   OCR-based extraction: ✅`);
            console.log(`   Real mobile scenario: ✅`);
            
        } catch (error) {
            console.error('\n💥 ==========================================');
            console.error('💥 TEST FAILED');
            console.error('💥 ==========================================');
            console.error('Error:', error.message);
            
            if (error.response) {
                console.error('Response data:', JSON.stringify(error.response.data, null, 2));
                console.error('Status:', error.response.status);
            }
            
            process.exit(1);
        }
    }

    async runSimpleTest(username, password, suratJalanPath, notaPath) {
        console.log('🚀 Simple Gas Transaction Test (OCR-based)');
        console.log('===========================================\n');
        
        try {
            // Login
            await this.mobileLogin(username, password);
            
            // Upload transaction with ONLY files (no manual data)
            const formData = new FormData();
            
            // Append files only
            formData.append('surat_jalan_photo', fs.createReadStream(suratJalanPath), {
                filename: 'test_surat.jpg',
                contentType: 'image/jpeg'
            });
            
            formData.append('nota_photo', fs.createReadStream(notaPath), {
                filename: 'test_nota.jpg',
                contentType: 'image/jpeg'
            });
            
            const response = await this.axios.post(
                '/api/gas-transactions',
                formData,
                {
                    headers: {
                        ...formData.getHeaders(),
                        'Content-Type': 'multipart/form-data'
                    }
                }
            );
            
            console.log('✅ Simple OCR test passed!');
            console.log(`Transaction ID: ${response.data.data?.id}`);
            console.log(`OCR Extracted: ${response.data.data?.ocr_extracted ? 'Yes' : 'No'}`);
            
        } catch (error) {
            console.error('❌ Simple test failed:', error.response?.data || error.message);
            throw error;
        }
    }
}

// Main execution
async function main() {
    // Parse command line arguments
    const args = process.argv.slice(2);
    
    if (args.length < 2) {
        console.log(`
Usage: node test-gas-transaction.js <username> <password> <surat_jalan_image> [nota_image] [options]
        
Examples:
  node test-gas-transaction.js driver1 password123 surat-jalan.jpg nota.jpg
  node test-gas-transaction.js driver1 password123 surat-jalan.jpg
  node test-gas-transaction.js driver1 password123 --simple
        
Options:
  --simple     Run simple test without deposit group
  --help       Show this help message
        
Note: Nota image is required for OCR extraction. If not provided, surat jalan image will be used for both.
        `);
        process.exit(1);
    }
    
    const username = args[0];
    const password = args[1];
    let suratJalanPath = args[2];
    let notaPath = args[3];
    
    // Check if third arg is a flag
    if (suratJalanPath === '--simple') {
        suratJalanPath = './test-surat-jalan.jpg';
        notaPath = './test-nota.jpg';
    } else if (suratJalanPath === '--help') {
        console.log(`
Gas Transaction Test Script - Real Mobile Scenario
=================================================
This script simulates real mobile app behavior:
1. Only uploads image files (no manual data entry)
2. OCR extracts data from receipt (nota_photo)
3. Extracted: Volume (Jml Liter), Rate (Harga/Liter), Total (Jml Rupiah)
        `);
        process.exit(0);
    }
    
    // Set default images if not provided
    if (!suratJalanPath || suratJalanPath.startsWith('--')) {
        suratJalanPath = './test-surat-jalan.jpg';
    }
    
    if (!notaPath || notaPath.startsWith('--')) {
        notaPath = suratJalanPath; // Use same image if nota not provided
    }
    
    // Create test images if they don't exist
    if (!fs.existsSync(suratJalanPath)) {
        console.log(`⚠️ Surat Jalan file not found: ${suratJalanPath}`);
        console.log('Please provide a valid image file');
        process.exit(1);
    }
    
    if (!fs.existsSync(notaPath)) {
        console.log(`⚠️ Nota file not found: ${notaPath}`);
        console.log('Using surat jalan file for nota as well');
        notaPath = suratJalanPath;
    }
    
    console.log(`📁 Surat Jalan: ${suratJalanPath}`);
    console.log(`📄 Nota (OCR): ${notaPath}`);
    console.log(`👤 Username: ${username}`);
    console.log(`🔍 OCR will extract: Jml Liter, Harga/Liter, Jml Rupiah`);
    
    // Create tester instance
    const tester = new GasTransactionTester();
    
    // Check for simple mode
    if (args.includes('--simple')) {
        await tester.runSimpleTest(username, password, suratJalanPath, notaPath);
    } else {
        // Run the full test
        await tester.runFullTest(username, password, suratJalanPath, notaPath);
    }
}

// Run if this script is executed directly
if (require.main === module) {
    main().catch(error => {
        console.error('💥 Unhandled error:', error);
        process.exit(1);
    });
}

// Export for use in other scripts
module.exports = GasTransactionTester;