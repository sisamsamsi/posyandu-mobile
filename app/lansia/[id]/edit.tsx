import React, { useEffect, useState } from 'react';
import { View, StyleSheet, SafeAreaView, TouchableOpacity, Text, Alert, ActivityIndicator } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { ArrowLeft } from 'lucide-react-native';
import { LansiaForm } from '../../../components/forms/LansiaForm';
import { useLansia } from '../../../hooks/useLansia';
import { Lansia } from '../../../lib/types';

export default function EditLansia() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const { getLansiaById, upsertLansia, loading: hookLoading } = useLansia();
  const [lansia, setLansia] = useState<Lansia | null>(null);
  const [fetching, setFetching] = useState(true);

  useEffect(() => {
    const fetchDetail = async () => {
      if (typeof id === 'string') {
        const data = await getLansiaById(id);
        setLansia(data);
      }
      setFetching(false);
    };
    fetchDetail();
  }, [id]);

  const handleSubmit = async (data: any) => {
    try {
      if (data.nik.length !== 16) {
        Alert.alert('Error', 'NIK harus 16 digit');
        return;
      }

      await upsertLansia({ ...data, id });
      Alert.alert('Sukses', 'Data Lansia berhasil diperbarui', [
        { text: 'OK', onPress: () => router.back() }
      ]);
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Gagal memperbarui data');
    }
  };

  if (fetching) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0D9488" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={24} color="#1E293B" />
        </TouchableOpacity>
        <Text style={styles.title}>Edit Lansia</Text>
      </View>

      {lansia && (
        <LansiaForm 
          initialData={lansia} 
          onSubmit={handleSubmit} 
          loading={hookLoading} 
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  backButton: {
    marginRight: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1E293B',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
