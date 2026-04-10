import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { AlertCircle, CheckCircle2, AlertTriangle, Info } from 'lucide-react-native';
import { RiskCalculationResult, RiskColor } from '../../lib/types';
import { Card } from './Card';

interface RiskSummaryProps {
  result: RiskCalculationResult;
}

export const RiskSummary: React.FC<RiskSummaryProps> = ({ result }) => {
  const getIcon = () => {
    switch (result.risk_color) {
      case 'red': return <AlertCircle size={32} color="#EF4444" />;
      case 'orange': return <AlertTriangle size={32} color="#F97316" />;
      case 'yellow': return <AlertTriangle size={32} color="#F59E0B" />;
      case 'green': return <CheckCircle2 size={32} color="#22C55E" />;
      default: return <Info size={32} color="#64748B" />;
    }
  };

  const getBackgroundStyle = () => {
    switch (result.risk_color) {
      case 'red': return { backgroundColor: '#FEF2F2', borderColor: '#FCA5A5' };
      case 'orange': return { backgroundColor: '#FFF7ED', borderColor: '#FED7AA' };
      case 'yellow': return { backgroundColor: '#FFFBEB', borderColor: '#FDE68A' };
      case 'green': return { backgroundColor: '#F0FDF4', borderColor: '#BBF7D0' };
      default: return { backgroundColor: '#F8FAFC', borderColor: '#E2E8F0' };
    }
  };

  const getTextColor = () => {
    switch (result.risk_color) {
      case 'red': return '#B91C1C';
      case 'orange': return '#C2410C';
      case 'yellow': return '#B45309';
      case 'green': return '#15803D';
      default: return '#334155';
    }
  };

  return (
    <View style={styles.container}>
      <View style={[styles.header, getBackgroundStyle()]}>
        <View style={styles.headerContent}>
          {getIcon()}
          <View style={styles.headerText}>
            <Text style={[styles.riskLevel, { color: getTextColor() }]}>{result.risk_level}</Text>
            <Text style={styles.scoreText}>Skor Kesehatan: {result.overall_score}/100</Text>
          </View>
        </View>
      </View>

      <Text style={styles.sectionTitle}>Analisis Parameter</Text>
      <View style={styles.breakdownGrid}>
        {Object.entries(result.breakdown).map(([key, item]) => (
          <Card key={key} style={styles.breakdownCard}>
            <Text style={styles.breakdownLabel}>{item.label}</Text>
            <Text style={styles.breakdownStatus}>{item.status}</Text>
            <View style={styles.progressBarContainer}>
               <View style={[styles.progressBar, { width: `${item.score}%`, backgroundColor: item.score > 70 ? '#EF4444' : item.score > 40 ? '#F97316' : '#22C55E' }]} />
            </View>
            <Text style={styles.breakdownScore}>Risiko: {item.score}%</Text>
          </Card>
        ))}
      </View>

      <Text style={styles.sectionTitle}>Rekomendasi Tindakan</Text>
      <View style={styles.recommendationList}>
        {result.recommendations.map((rec, i) => (
          <View key={i} style={styles.recommendationItem}>
            <View style={[styles.recommendationDot, { backgroundColor: getTextColor() }]} />
            <Text style={styles.recommendationText}>{rec}</Text>
          </View>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingBottom: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 24,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerText: {
    marginLeft: 16,
  },
  riskLevel: {
    fontSize: 20,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  scoreText: {
    fontSize: 14,
    color: '#64748B',
    marginTop: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1E293B',
    marginBottom: 16,
  },
  breakdownGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  breakdownCard: {
    width: '48%',
    marginBottom: 16,
    padding: 12,
  },
  breakdownLabel: {
    fontSize: 11,
    color: '#64748B',
    marginBottom: 4,
  },
  breakdownStatus: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#1E293B',
    marginBottom: 8,
  },
  progressBarContainer: {
    height: 6,
    backgroundColor: '#F1F5F9',
    borderRadius: 3,
    marginBottom: 6,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    borderRadius: 3,
  },
  breakdownScore: {
    fontSize: 10,
    textAlign: 'right',
    color: '#94A3B8',
  },
  recommendationList: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  recommendationItem: {
    flexDirection: 'row',
    marginBottom: 12,
    alignItems: 'flex-start',
  },
  recommendationDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginTop: 7,
    marginRight: 10,
  },
  recommendationText: {
    fontSize: 14,
    color: '#334155',
    flex: 1,
    lineHeight: 20,
  },
});
