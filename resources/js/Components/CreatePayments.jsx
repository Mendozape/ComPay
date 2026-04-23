import React, { useEffect, useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { useLocalSearchParams, useRouter } from 'expo-router';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Toast from 'react-native-toast-message';

import { API_BASE } from '../../../src/api/axios';
import { ThemedText } from '@/components/themed-text';

export default function CreatePaymentScreen() {
  const { addressId } = useLocalSearchParams();
  const router = useRouter();

  const [fees, setFees] = useState<any[]>([]);
  const [feeId, setFeeId] = useState('');
  const [year, setYear] = useState('');
  const [paidMonths, setPaidMonths] = useState<any[]>([]);
  const [selectedMonths, setSelectedMonths] = useState<number[]>([]);
  const [waivedMonths, setWaivedMonths] = useState<number[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const currentYear = new Date().getFullYear();

  const months = [
    { value: 1, label: 'Ene' }, { value: 2, label: 'Feb' }, { value: 3, label: 'Mar' },
    { value: 4, label: 'Abr' }, { value: 5, label: 'May' }, { value: 6, label: 'Jun' },
    { value: 7, label: 'Jul' }, { value: 8, label: 'Ago' }, { value: 9, label: 'Sep' },
    { value: 10, label: 'Oct' }, { value: 11, label: 'Nov' }, { value: 12, label: 'Dic' },
  ];

  useEffect(() => {
    fetchFees();
  }, []);

  useEffect(() => {
    if (feeId && year) {
      fetchPaidMonths();
    }
  }, [feeId, year, addressId]);

  const fetchFees = async () => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      const t = new Date().getTime();

      const res = await axios.get(`${API_BASE}/fees?t=${t}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setFees(res.data.data);
    } catch (e) {
      Alert.alert('Error', 'No se pudieron cargar cuotas');
    } finally {
      setLoading(false);
    }
  };

  const fetchPaidMonths = async () => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      const t = new Date().getTime();

      const res = await axios.get(
        `${API_BASE}/address_payments/paid-months/${addressId}/${year}?fee_id=${feeId}&t=${t}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setPaidMonths(res.data.months || []);

      // 🔥 LIMPIAR SELECCIÓN CUANDO REFRESCA
      setSelectedMonths([]);
      setWaivedMonths([]);

    } catch (e) {
      setPaidMonths([]);
    }
  };

  const isMonthRegistered = (m: number) =>
    paidMonths.some((x) => x.month === m);

  const getMonthStatus = (m: number) =>
    paidMonths.find((x) => x.month === m);

  const handleActionChange = (month: number, action: 'pay' | 'waive') => {
    if (isMonthRegistered(month)) return;

    let newSelected = selectedMonths.filter(m => m !== month);
    let newWaived = waivedMonths.filter(m => m !== month);

    newSelected.push(month);

    if (action === 'waive') {
      newWaived.push(month);
    }

    setSelectedMonths(newSelected);
    setWaivedMonths(newWaived);
  };

  const handleSave = async () => {
    if (selectedMonths.length === 0) {
      Toast.show({ type: 'error', text1: 'Selecciona meses' });
      return;
    }

    setIsSaving(true);

    try {
      const token = await AsyncStorage.getItem('userToken');

      await axios.post(`${API_BASE}/address_payments`, {
        address_id: addressId,
        fee_id: feeId,
        year,
        months: selectedMonths,
        waived_months: waivedMonths
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      Toast.show({
        type: 'success',
        text1: '¡Éxito!',
        text2: 'Pagos registrados'
      });

      // 🔥 REFRESH REAL
      await fetchPaidMonths();

    } catch (e: any) {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: e.response?.data?.message || 'Error al guardar'
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (loading) {
    return <ActivityIndicator style={{ flex: 1 }} size="large" />;
  }

  return (
    <ScrollView style={styles.container}>

      <View style={styles.card}>

        <ThemedText style={styles.label}>Cuota</ThemedText>
        <Picker selectedValue={feeId} onValueChange={setFeeId}>
          <Picker.Item label="Seleccione..." value="" />
          {fees.map(f => (
            <Picker.Item key={f.id} label={f.name} value={f.id} />
          ))}
        </Picker>

        <ThemedText style={styles.label}>Año</ThemedText>
        <Picker selectedValue={year} onValueChange={setYear}>
          <Picker.Item label="Seleccionar" value="" />
          <Picker.Item label={`${currentYear}`} value={`${currentYear}`} />
        </Picker>

        {/* 🔥 MESES */}
        {feeId && year && (
          <View style={styles.monthsContainer}>
            {months.map(m => {
              const status = getMonthStatus(m.value);
              const isPay = selectedMonths.includes(m.value) && !waivedMonths.includes(m.value);
              const isWaive = waivedMonths.includes(m.value);

              return (
                <View key={m.value} style={styles.monthBox}>

                  <ThemedText style={styles.monthLabel}>{m.label}</ThemedText>

                  {status ? (
                    <View style={[
                      styles.badge,
                      status.status === 'Condonado' ? styles.condo : styles.paid
                    ]}>
                      <ThemedText style={styles.badgeText}>
                        {status.status[0]}
                      </ThemedText>
                    </View>
                  ) : (
                    <View style={styles.actions}>
                      <TouchableOpacity
                        style={[styles.btn, isPay && styles.btnActive]}
                        onPress={() => handleActionChange(m.value, 'pay')}
                      >
                        <ThemedText style={styles.btnText}>P</ThemedText>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={[styles.btn, isWaive && styles.btnCond]}
                        onPress={() => handleActionChange(m.value, 'waive')}
                      >
                        <ThemedText style={styles.btnText}>C</ThemedText>
                      </TouchableOpacity>
                    </View>
                  )}

                </View>
              );
            })}
          </View>
        )}

        <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={isSaving}>
          <ThemedText style={styles.btnText}>
            {isSaving ? 'Guardando...' : 'Guardar'}
          </ThemedText>
        </TouchableOpacity>

      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f4f6f9' },
  card: { margin: 20, backgroundColor: 'white', padding: 20, borderRadius: 12 },
  label: { fontWeight: 'bold', marginTop: 10 },

  monthsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 15
  },

  monthBox: {
    width: '25%',
    alignItems: 'center',
    marginBottom: 15
  },

  monthLabel: { marginBottom: 5 },

  actions: {
    flexDirection: 'row',
    gap: 5
  },

  btn: {
    borderWidth: 1,
    borderColor: '#ccc',
    padding: 6,
    borderRadius: 6
  },

  btnActive: {
    backgroundColor: '#28a745'
  },

  btnCond: {
    backgroundColor: '#17a2b8'
  },

  btnText: {
    color: 'white',
    fontWeight: 'bold'
  },

  badge: {
    padding: 6,
    borderRadius: 6
  },

  paid: {
    backgroundColor: '#28a745'
  },

  condo: {
    backgroundColor: '#17a2b8'
  },

  badgeText: {
    color: 'white',
    fontWeight: 'bold'
  },

  saveBtn: {
    marginTop: 20,
    backgroundColor: '#28a745',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center'
  }
});