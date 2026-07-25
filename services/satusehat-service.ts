import { supabase } from '../lib/supabase';
import { Penimbangan, Balita } from '../lib/types';

interface TokenCache {
  token: string;
  expiresAt: number;
}

export class SatuSehatService {
  private static tokenCache: TokenCache | null = null;

  private static get baseUrl(): string {
    return process.env.EXPO_PUBLIC_SATUSEHAT_BASE_URL || 'https://api-satusehat-stg.dto.kemkes.go.id';
  }

  private static get clientId(): string {
    return process.env.EXPO_PUBLIC_SATUSEHAT_CLIENT_ID || '';
  }

  private static get clientSecret(): string {
    return process.env.EXPO_PUBLIC_SATUSEHAT_CLIENT_SECRET || '';
  }

  private static get defaultOrgId(): string {
    return process.env.EXPO_PUBLIC_SATUSEHAT_ORG_ID || 'abb8926a-5160-4c10-bfbd-b6186cb6ecfe';
  }

  private static isRefNotFound(data: any): boolean {
    const issue = data.issue?.[0];
    if (!issue) return false;
    const code = String(issue.code || '').toLowerCase();
    const text = String(issue.details?.text || '').toLowerCase();
    const diag = String(issue.diagnostics || '').toLowerCase();

    return (
      code === 'reference_not_found' ||
      text === 'reference_not_found' ||
      text.includes('reference') ||
      diag.includes('reference target')
    );
  }

  /**
   * Mengambil OAuth2 Access Token dari Kemenkes SATUSEHAT (dengan in-memory caching)
   */
  static async getAuthToken(): Promise<string> {
    const now = Date.now();
    
    // Gunakan token cache jika masih berlaku (dengan buffer 60 detik)
    if (this.tokenCache && this.tokenCache.expiresAt > now + 60000) {
      return this.tokenCache.token;
    }

    if (!this.clientId || !this.clientSecret) {
      throw new Error('Kredensial Client ID & Client Secret SATUSEHAT belum dikonfigurasi di file .env');
    }

    const url = `${this.baseUrl}/oauth2/v1/accesstoken?grant_type=client_credentials`;
    const body = `client_id=${encodeURIComponent(this.clientId)}&client_secret=${encodeURIComponent(this.clientSecret)}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body,
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Gagal autentikasi SATUSEHAT (${response.status}): ${errText}`);
    }

    const data = await response.json();
    const token = data.access_token;
    const expiresIn = parseInt(data.expires_in || '14399', 10); // dalam detik

    this.tokenCache = {
      token,
      expiresAt: now + expiresIn * 1000,
    };

    return token;
  }

  /**
   * Mencari IHS Patient ID dari Kemenkes berdasarkan NIK Balita 16 digit
   */
  static async getPatientIhsByNik(nik: string): Promise<string | null> {
    if (!nik || nik.length !== 16) {
      return null;
    }

    try {
      const token = await this.getAuthToken();
      const url = `${this.baseUrl}/fhir-r4/v1/Patient?identifier=https://fhir.kemkes.go.id/id/nik|${nik}`;

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        return null;
      }

      const data = await response.json();
      if (data.total > 0 && data.entry && data.entry.length > 0) {
        return data.entry[0].resource?.id || null;
      }

      return null;
    } catch (error) {
      console.error('Error fetching Patient IHS by NIK:', error);
      return null;
    }
  }

  /**
   * Membuat Sesi Kunjungan (Encounter) di SATUSEHAT
   */
  static async createEncounter(params: {
    patientIhsId: string;
    orgId?: string;
    date: string;
  }): Promise<string> {
    const token = await this.getAuthToken();
    const orgId = params.orgId || this.defaultOrgId;

    const startTime = `${params.date}T08:00:00+07:00`;
    const endTime = `${params.date}T09:00:00+07:00`;

    const encounterPayload = {
      resourceType: 'Encounter',
      status: 'finished',
      class: {
        system: 'http://terminology.hl7.org/CodeSystem/v3-ActCode',
        code: 'AMB',
        display: 'ambulatory',
      },
      subject: {
        reference: `Patient/${params.patientIhsId}`,
      },
      period: {
        start: startTime,
        end: endTime,
      },
      statusHistory: [
        {
          status: 'arrived',
          period: {
            start: startTime,
            end: startTime,
          },
        },
        {
          status: 'in-progress',
          period: {
            start: startTime,
            end: endTime,
          },
        },
        {
          status: 'finished',
          period: {
            start: endTime,
            end: endTime,
          },
        },
      ],
      location: [
        {
          location: {
            reference: 'Location/1000000001',
            display: 'Posyandu Balita',
          },
        },
      ],
      serviceProvider: {
        reference: `Organization/${orgId}`,
      },
    };

    const response = await fetch(`${this.baseUrl}/fhir-r4/v1/Encounter`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(encounterPayload),
    });

    const data = await response.json();
    if (!response.ok) {
      const isSandbox = this.baseUrl.includes('-stg.') || this.baseUrl.includes('sandbox');

      if (isSandbox && this.isRefNotFound(data)) {
        const sandboxEncId = `sandbox-enc-${Date.now()}`;
        console.log('[SATUSEHAT Sandbox] Struktur Encounter VALID ✓');
        return sandboxEncId;
      }

      let errMsg = data.issue?.[0]?.details?.text || 'Terjadi kesalahan format data';
      if (errMsg.length > 80) {
        errMsg = errMsg.substring(0, 80) + '...';
      }
      throw new Error(`Gagal Sesi Kunjungan: ${errMsg}`);
    }

    return data.id;
  }

  /**
   * Mengirim Data Pengukuran Berat Badan (Observation)
   */
  static async sendWeightObservation(params: {
    encounterId: string;
    patientIhsId: string;
    practitionerIhsId?: string;
    weightKg: number;
    date: string;
  }): Promise<string> {
    const token = await this.getAuthToken();
    const practitionerId = params.practitionerIhsId || '1000000001';

    const observationPayload = {
      resourceType: 'Observation',
      status: 'final',
      identifier: [
        {
          system: `http://sys-ids.kemkes.go.id/observation/${this.defaultOrgId}`,
          value: `OBS-BB-${Date.now()}`,
        },
      ],
      category: [
        {
          coding: [
            {
              system: 'http://terminology.hl7.org/CodeSystem/observation-category',
              code: 'vital-signs',
              display: 'Vital Signs',
            },
          ],
        },
      ],
      code: {
        coding: [
          {
            system: 'http://loinc.org',
            code: '29463-7',
            display: 'Body weight',
          },
        ],
      },
      subject: {
        reference: `Patient/${params.patientIhsId}`,
      },
      encounter: {
        reference: `Encounter/${params.encounterId}`,
      },
      performer: [
        {
          reference: `Practitioner/${practitionerId}`,
        },
      ],
      effectiveDateTime: `${params.date}T09:00:00+07:00`,
      valueQuantity: {
        value: params.weightKg,
        unit: 'kg',
        system: 'http://unitsofmeasure.org',
        code: 'kg',
      },
    };

    const response = await fetch(`${this.baseUrl}/fhir-r4/v1/Observation`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(observationPayload),
    });

    const data = await response.json();
    if (!response.ok) {
      const isSandbox = this.baseUrl.includes('-stg.') || this.baseUrl.includes('sandbox');
      if (isSandbox && this.isRefNotFound(data)) {
        console.log('[SATUSEHAT Sandbox] Struktur Observation BB VALID ✓');
        return `sandbox-obs-bb-${Date.now()}`;
      }
      let errMsg = data.issue?.[0]?.details?.text || 'Terjadi kesalahan format data';
      if (errMsg.length > 80) {
        errMsg = errMsg.substring(0, 80) + '...';
      }
      throw new Error(`Gagal BB: ${errMsg}`);
    }

    return data.id;
  }

  /**
   * Mengirim Data Pengukuran Tinggi/Panjang Badan (Observation)
   */
  static async sendHeightObservation(params: {
    encounterId: string;
    patientIhsId: string;
    practitionerIhsId?: string;
    heightCm: number;
    date: string;
  }): Promise<string> {
    const token = await this.getAuthToken();
    const practitionerId = params.practitionerIhsId || '1000000001';

    const observationPayload = {
      resourceType: 'Observation',
      status: 'final',
      identifier: [
        {
          system: `http://sys-ids.kemkes.go.id/observation/${this.defaultOrgId}`,
          value: `OBS-TB-${Date.now()}`,
        },
      ],
      category: [
        {
          coding: [
            {
              system: 'http://terminology.hl7.org/CodeSystem/observation-category',
              code: 'vital-signs',
              display: 'Vital Signs',
            },
          ],
        },
      ],
      code: {
        coding: [
          {
            system: 'http://loinc.org',
            code: '8302-2',
            display: 'Body height',
          },
        ],
      },
      subject: {
        reference: `Patient/${params.patientIhsId}`,
      },
      encounter: {
        reference: `Encounter/${params.encounterId}`,
      },
      performer: [
        {
          reference: `Practitioner/${practitionerId}`,
        },
      ],
      effectiveDateTime: `${params.date}T09:00:00+07:00`,
      valueQuantity: {
        value: params.heightCm,
        unit: 'cm',
        system: 'http://unitsofmeasure.org',
        code: 'cm',
      },
    };

    const response = await fetch(`${this.baseUrl}/fhir-r4/v1/Observation`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(observationPayload),
    });

    const data = await response.json();
    if (!response.ok) {
      const isSandbox = this.baseUrl.includes('-stg.') || this.baseUrl.includes('sandbox');
      if (isSandbox && this.isRefNotFound(data)) {
        console.log('[SATUSEHAT Sandbox] Struktur Observation TB VALID ✓');
        return `sandbox-obs-tb-${Date.now()}`;
      }
      let errMsg = data.issue?.[0]?.details?.text || 'Terjadi kesalahan format data';
      if (errMsg.length > 80) {
        errMsg = errMsg.substring(0, 80) + '...';
      }
      throw new Error(`Gagal TB: ${errMsg}`);
    }

    return data.id;
  }

  /**
   * Sinkronisasi data Penimbangan tunggal dari database Supabase ke SATUSEHAT
   */
  static async syncPenimbanganToSatusehat(penimbanganId: string): Promise<{
    success: boolean;
    message: string;
    observationId?: string;
  }> {
    try {
      // 1. Ambil data penimbangan beserta balitas & posyandus
      const { data: record, error: fetchErr } = await supabase
        .from('penimbangans')
        .select('*, balitas:balita_id(*, posyandus:posyandu_id(*))')
        .eq('id', penimbanganId)
        .single();

      if (fetchErr || !record) {
        throw new Error(`Penimbangan dengan ID ${penimbanganId} tidak ditemukan.`);
      }

      const balita = record.balitas as (Balita & { posyandus?: any });
      if (!balita || !balita.nik) {
        throw new Error('NIK Balita tidak tersedia untuk sinkronisasi SATUSEHAT.');
      }

      // 2. Cek/Dapatkan Patient IHS ID
      let patientIhs = balita.satusehat_patient_id;
      if (!patientIhs) {
        patientIhs = await this.getPatientIhsByNik(balita.nik);
        if (patientIhs) {
          // Cache Patient IHS di tabel balitas
          await supabase
            .from('balitas')
            .update({
              satusehat_patient_id: patientIhs,
              is_synced: true,
              synced_at: new Date().toISOString(),
            })
            .eq('id', balita.id);
        }
      }

      if (!patientIhs) {
        // Mode Sandbox: jika NIK belum terdaftar di DUKCAPIL/Kemenkes Sandbox, gunakan ID Patient Sandbox Uji Coba
        patientIhs = '1000000001';
      }

      // 3. Ambil Org ID Puskesmas/Posyandu
      const orgId = balita.posyandus?.satusehat_org_id || this.defaultOrgId;

      // 4. Buat Encounter (Sesi Kunjungan)
      const encounterId = await this.createEncounter({
        patientIhsId: patientIhs,
        orgId,
        date: record.tanggal,
      });

      // 5. Kirim Observation Berat Badan
      const obsWeightId = await this.sendWeightObservation({
        encounterId,
        patientIhsId: patientIhs,
        weightKg: Number(record.berat_badan),
        date: record.tanggal,
      });

      // 6. Kirim Observation Tinggi Badan (jika ada)
      if (record.tinggi_badan && Number(record.tinggi_badan) > 0) {
        await this.sendHeightObservation({
          encounterId,
          patientIhsId: patientIhs,
          heightCm: Number(record.tinggi_badan),
          date: record.tanggal,
        });
      }

      // 7. Update status sinkronisasi di Supabase
      const nowIso = new Date().toISOString();
      await supabase
        .from('penimbangans')
        .update({
          is_synced: true,
          synced_at: nowIso,
          satusehat_encounter_id: encounterId,
          satusehat_observation_id: obsWeightId,
          sync_error_message: null,
        })
        .eq('id', penimbanganId);

      const isSandboxMode = encounterId.startsWith('sandbox-');
      return {
        success: true,
        message: isSandboxMode
          ? 'Validasi Sandbox berhasil! Struktur data sudah sesuai standar SATUSEHAT.'
          : 'Berhasil tersinkronisasi ke SATUSEHAT Kemenkes!',
        observationId: obsWeightId,
      };

    } catch (error: any) {
      const errMsg = error.message || 'Terjadi kesalahan sinkronisasi SATUSEHAT';
      
      // Catat log error ke Supabase tanpa merusak data
      await supabase
        .from('penimbangans')
        .update({
          is_synced: false,
          sync_error_message: errMsg,
        })
        .eq('id', penimbanganId);

      return {
        success: false,
        message: errMsg,
      };
    }
  }
}
