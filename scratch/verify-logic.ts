import { ZScoreEngine } from '../services/zscore-engine';
import { RiskPredictionService } from '../services/risk-prediction';
import { Balita, Penimbangan } from '../lib/types';

// Mock data for standards (normally from store)
const imtStandards = require('../assets/data/who_imt_u.json');
const tbStandards = require('../assets/data/who_tb_u.json');
const bbStandards = require('../assets/data/who_bb_u.json');

const testBalita: Balita = {
    id: 'test-1',
    nama: 'Ahmad',
    tanggal_lahir: '2024-01-10', // 12 months ago from 2025-01-10
    jenis_kelamin: 'Laki-laki',
    nik: '123',
    nama_ortu: 'Budi',
    alamat: 'Jl Semangka',
    rt: 1,
    posyandu_id: null,
    created_at: new Date().toISOString()
};

const runTest = () => {
    console.log('--- RUNNING LOGIC VERIFICATION ---');
    
    // Sample measurement for 12 month old boy
    const weight = 8.5; // Slightly underweight for 12m
    const height = 72;  // Slightly short
    const date = '2025-01-10';
    const ageMonths = 12;
    const sex: 'L' | 'P' = 'L';

    // BMI
    const bmi = weight / ((height / 100) ** 2);
    console.log(`BMI: ${bmi.toFixed(2)}`);

    // Z-Scores
    const zImt = ZScoreEngine.calculate(imtStandards, sex, ageMonths, bmi, 'IMT/U');
    const zTb = ZScoreEngine.calculate(tbStandards, sex, ageMonths, height, 'TB/U');
    const zBb = ZScoreEngine.calculate(bbStandards, sex, ageMonths, weight, 'BB/U');

    console.log(`Z-IMT: ${zImt.zscore} (${zImt.status})`);
    console.log(`Z-TB: ${zTb.zscore} (${zTb.status})`);
    console.log(`Z-BB: ${zBb.zscore} (${zBb.status})`);

    // Risk Prediction
    const current: Partial<Penimbangan> = {
        tanggal: date,
        berat_badan: weight,
        tinggi_badan: height,
        zscore_imt_u: zImt.zscore,
        status_gizi_imt_u: zImt.status,
        zscore_tb_u: zTb.zscore,
        status_tb_u: zTb.status,
        zscore_bb_u: zBb.zscore,
        status_bb_u: zBb.status
    };

    const risk = RiskPredictionService.calculate(testBalita, current, []);

    console.log('\n--- RISK ASSESSMENT ---');
    console.log(`Score: ${risk.overall_score}`);
    console.log(`Level: ${risk.risk_level} (${risk.risk_color})`);
    console.log('Recommendations:', risk.recommendations.join('\n- '));
    console.log('\n--- VERIFICATION COMPLETE ---');
};

runTest();
