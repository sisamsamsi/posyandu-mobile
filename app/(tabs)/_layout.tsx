// app/(tabs)/_layout.tsx
import React, { useState } from 'react';
import { Platform, View, TouchableOpacity, Text, StyleSheet, Modal, Pressable } from 'react-native';
import { Tabs, useRouter } from 'expo-router';
import { Home, ClipboardList, BarChart3, FileText, Plus, X, Baby, Users, Brain, Syringe, Activity, ChevronRight } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS } from '../../lib/constants';
import { useServiceStore } from '../../stores/service-store';

interface TabIconProps {
  focused: boolean;
  color: string;
  Icon: React.ComponentType<{ size: number; color: string }>;
  primaryColor: string;
}

const TabIcon = ({ focused, color, Icon, primaryColor }: TabIconProps) => {
  return (
    <View style={{ alignItems: 'center', justifyContent: 'center', height: 40, marginTop: 4 }}>
      <View 
        style={{
          paddingHorizontal: 14,
          paddingVertical: 5,
          borderRadius: 20,
          backgroundColor: focused ? `${primaryColor}15` : 'transparent', // 15% opacity primary color
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: 1,
        }}
      >
        <Icon size={focused ? 21 : 19} color={focused ? primaryColor : color} />
      </View>
      {focused && (
        <View 
          style={{ 
            width: 4, 
            height: 4, 
            borderRadius: 2, 
            backgroundColor: primaryColor,
            marginTop: 1,
          }} 
        />
      )}
    </View>
  );
};

export default function TabLayout() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { activeWorkspace } = useServiceStore();
  const [plusModalVisible, setPlusModalVisible] = useState(false);
  
  const isBalita = activeWorkspace === 'balita';
  const currentPrimary = isBalita ? COLORS.tealPrimary : COLORS.indigoPrimary;
  const currentBg = isBalita ? COLORS.tealBg : COLORS.indigoBg;
  const currentTonal = isBalita ? COLORS.tealTonal : COLORS.indigoTonal;

  // Hitung padding bawah secara dinamis:
  const bottomPadding = Platform.OS === 'android' 
    ? Math.max(insets.bottom, 8)
    : insets.bottom + 4;

  const tabBarHeight = 58 + bottomPadding;

  const handlePlusAction = (route: string) => {
    setPlusModalVisible(false);
    router.push(route as any);
  };

  return (
    <>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: currentPrimary,
          tabBarInactiveTintColor: '#94A3B8',
          tabBarHideOnKeyboard: true,
          tabBarLabelStyle: {
            fontSize: 10,
            fontWeight: '800',
            paddingBottom: 2,
          },
          tabBarStyle: {
            height: tabBarHeight + 4,
            paddingBottom: bottomPadding + 3,
            paddingTop: 8,
            borderTopWidth: 0,
            backgroundColor: '#FFFFFF',
            elevation: 32,
            shadowColor: currentPrimary,
            shadowOffset: { width: 0, height: -8 },
            shadowOpacity: 0.04,
            shadowRadius: 20,
            borderTopLeftRadius: 30,
            borderTopRightRadius: 30,
          },
          headerStyle: {
            backgroundColor: '#FFFFFF',
            elevation: 0,
            shadowOpacity: 0,
          },
          headerTitleStyle: {
            fontWeight: '900',
            fontSize: 18,
            color: '#1E293B',
            letterSpacing: -0.5,
          },
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: 'Beranda',
            headerShown: false,
            tabBarIcon: ({ color, focused }) => <TabIcon focused={focused} color={color} Icon={Home} primaryColor={currentPrimary} />,
          }}
        />
        <Tabs.Screen
          name="data"
          options={{
            title: isBalita ? 'Balita' : 'Lansia',
            tabBarIcon: ({ color, focused }) => (
              <TabIcon 
                focused={focused} 
                color={color} 
                Icon={isBalita ? Baby : Users} 
                primaryColor={currentPrimary} 
              />
            ),
          }}
        />
        <Tabs.Screen
          name="service-desk"
          options={{
            title: '',
            tabBarIcon: ({ color, focused }) => (
              <View style={{
                width: 54,
                height: 54,
                borderRadius: 27,
                backgroundColor: currentPrimary,
                justifyContent: 'center',
                alignItems: 'center',
                marginTop: -16,
                elevation: 8,
                shadowColor: currentPrimary,
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.3,
                shadowRadius: 6,
                borderWidth: 4,
                borderColor: '#FFFFFF',
              }}>
                <Plus size={24} color="#FFFFFF" strokeWidth={3} />
              </View>
            ),
          }}
          listeners={{
            tabPress: (e) => {
              e.preventDefault();
              setPlusModalVisible(true);
            }
          }}
        />
        <Tabs.Screen
          name="analisis"
          options={{
            title: 'Analisis',
            tabBarIcon: ({ color, focused }) => <TabIcon focused={focused} color={color} Icon={BarChart3} primaryColor={currentPrimary} />,
          }}
        />
        <Tabs.Screen
          name="laporan"
          options={{
            title: 'Laporan',
            tabBarIcon: ({ color, focused }) => <TabIcon focused={focused} color={color} Icon={FileText} primaryColor={currentPrimary} />,
          }}
        />
      </Tabs>

      {/* PLUS ACTION BOTTOM SHEET MODAL */}
      <Modal
        visible={plusModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setPlusModalVisible(false)}
      >
        <Pressable 
          style={styles.modalOverlay} 
          onPress={() => setPlusModalVisible(false)}
        >
          <View style={styles.modalContent}>
            {/* Modal Drag Handle */}
            <View style={styles.dragHandle} />

            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Layanan Posyandu</Text>
                <Text style={styles.modalSubtitle}>Aksi Cepat Kader SIMPUL SEHAT</Text>
              </View>
              <TouchableOpacity 
                style={styles.closeBtnContainer} 
                onPress={() => setPlusModalVisible(false)}
              >
                <X size={20} color="#64748B" />
              </TouchableOpacity>
            </View>

            <View style={styles.modalBody}>
              {isBalita ? (
                <>
                  <TouchableOpacity 
                    style={styles.actionItem} 
                    onPress={() => handlePlusAction('/service-desk/balita')}
                    activeOpacity={0.7}
                  >
                    <View style={[styles.actionIconContainer, { backgroundColor: '#F0FDFA' }]}>
                      <Activity size={22} color={COLORS.tealPrimary} />
                    </View>
                    <View style={styles.actionTextContainer}>
                      <Text style={styles.actionTitle}>Timbang & Ukur Gizi</Text>
                      <Text style={styles.actionDesc}>Input data antropometri pertumbuhan anak bulanan (Meja 3)</Text>
                    </View>
                    <ChevronRight size={18} color="#94A3B8" />
                  </TouchableOpacity>

                  <TouchableOpacity 
                    style={styles.actionItem} 
                    onPress={() => handlePlusAction('/imunisasi')}
                    activeOpacity={0.7}
                  >
                    <View style={[styles.actionIconContainer, { backgroundColor: '#F5F3FF' }]}>
                      <Syringe size={22} color="#8B5CF6" />
                    </View>
                    <View style={styles.actionTextContainer}>
                      <Text style={styles.actionTitle}>Pencatatan Imunisasi</Text>
                      <Text style={styles.actionDesc}>Pantau dan catat imunisasi dasar wajib anak</Text>
                    </View>
                    <ChevronRight size={18} color="#94A3B8" />
                  </TouchableOpacity>

                  <TouchableOpacity 
                    style={styles.actionItem} 
                    onPress={() => handlePlusAction('/counseling/queue')}
                    activeOpacity={0.7}
                  >
                    <View style={[styles.actionIconContainer, { backgroundColor: '#FDF2F8' }]}>
                      <Brain size={22} color="#DB2777" />
                    </View>
                    <View style={styles.actionTextContainer}>
                      <Text style={styles.actionTitle}>Penyuluhan Gizi AI</Text>
                      <Text style={styles.actionDesc}>Konseling cerdas tumbuh kembang & wawancara ibu (Meja 4/5)</Text>
                    </View>
                    <ChevronRight size={18} color="#94A3B8" />
                  </TouchableOpacity>
                </>
              ) : (
                <>
                  <TouchableOpacity 
                    style={styles.actionItem} 
                    onPress={() => handlePlusAction('/service-desk/lansia')}
                    activeOpacity={0.7}
                  >
                    <View style={[styles.actionIconContainer, { backgroundColor: '#EEF2FF' }]}>
                      <Activity size={22} color={COLORS.indigoPrimary} />
                    </View>
                    <View style={styles.actionTextContainer}>
                      <Text style={styles.actionTitle}>Pemeriksaan Fisik Lansia</Text>
                      <Text style={styles.actionDesc}>Tensi darah, gula, kolesterol, dan asam urat</Text>
                    </View>
                    <ChevronRight size={18} color="#94A3B8" />
                  </TouchableOpacity>

                  <TouchableOpacity 
                    style={styles.actionItem} 
                    onPress={() => handlePlusAction('/monitoring/lansia')}
                    activeOpacity={0.7}
                  >
                    <View style={[styles.actionIconContainer, { backgroundColor: '#FFF7ED' }]}>
                      <ClipboardList size={22} color="#EA580C" />
                    </View>
                    <View style={styles.actionTextContainer}>
                      <Text style={styles.actionTitle}>Monitoring Kunjungan</Text>
                      <Text style={styles.actionDesc}>Rekapitulasi kehadiran lansia bulan berjalan</Text>
                    </View>
                    <ChevronRight size={18} color="#94A3B8" />
                  </TouchableOpacity>

                  <TouchableOpacity 
                    style={styles.actionItem} 
                    onPress={() => handlePlusAction('/lansia/create')}
                    activeOpacity={0.7}
                  >
                    <View style={[styles.actionIconContainer, { backgroundColor: '#EEF2FF' }]}>
                      <Users size={22} color={COLORS.indigoPrimary} />
                    </View>
                    <View style={styles.actionTextContainer}>
                      <Text style={styles.actionTitle}>Daftar Lansia Baru</Text>
                      <Text style={styles.actionDesc}>Registrasi data rekam medis dasar lansia baru</Text>
                    </View>
                    <ChevronRight size={18} color="#94A3B8" />
                  </TouchableOpacity>
                </>
              )}
            </View>
          </View>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.45)', // Premium dark blur shade
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    paddingHorizontal: 24,
    paddingTop: 10,
    paddingBottom: Platform.OS === 'ios' ? 44 : 32,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: -12 },
    shadowOpacity: 0.08,
    shadowRadius: 24,
    elevation: 24,
  },
  dragHandle: {
    width: 36,
    height: 5,
    backgroundColor: '#E2E8F0',
    borderRadius: 2.5,
    alignSelf: 'center',
    marginBottom: 18,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: '#0F172A',
    letterSpacing: -0.5,
  },
  modalSubtitle: {
    fontSize: 13,
    color: '#64748B',
    fontWeight: '600',
    marginTop: 2,
  },
  closeBtnContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalBody: {
    gap: 14,
  },
  actionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#F1F5F9',
    borderRadius: 24,
    padding: 16,
    gap: 14,
  },
  actionIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionTextContainer: {
    flex: 1,
  },
  actionTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
  },
  actionDesc: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 4,
    lineHeight: 16,
    fontWeight: '500',
  },
});
