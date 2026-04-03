import React, { useState, useCallback, useMemo } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import Svg, { Polygon, Line, Text as SvgText, Circle } from 'react-native-svg';
import { solveTriangle } from './triangleSolver';

const VB_W = 300;
const VB_H = 260;
const PAD = 35;

function computeVertices(result) {
  if (!result || result.error) return null;

  const a = Number(result.a);
  const b = Number(result.b);
  const c = Number(result.c);
  const B_rad = Number(result.B) * (Math.PI / 180);

  if ([a, b, c, B_rad].some(v => !isFinite(v) || v <= 0)) return null;

  // Place B at origin, C along +x (side a = BC), A using angle B
  const rawB = { x: 0, y: 0 };
  const rawC = { x: a, y: 0 };
  const rawA = { x: c * Math.cos(B_rad), y: -c * Math.sin(B_rad) };

  const xs = [rawA.x, rawB.x, rawC.x];
  const ys = [rawA.y, rawB.y, rawC.y];
  const minX = Math.min(...xs), maxX = Math.max(...xs);
  const minY = Math.min(...ys), maxY = Math.max(...ys);
  const triW = maxX - minX || 1;
  const triH = maxY - minY || 1;

  const scale = Math.min((VB_W - 2 * PAD) / triW, (VB_H - 2 * PAD) / triH);
  const offX = (VB_W - triW * scale) / 2 - minX * scale;
  const offY = (VB_H - triH * scale) / 2 - minY * scale;

  const tx = p => ({ x: p.x * scale + offX, y: p.y * scale + offY });
  return { A: tx(rawA), B: tx(rawB), C: tx(rawC) };
}

function labelOffset(vertex, center, dist) {
  const dx = vertex.x - center.x;
  const dy = vertex.y - center.y;
  const len = Math.sqrt(dx * dx + dy * dy) || 1;
  return { x: vertex.x + (dx / len) * dist, y: vertex.y + (dy / len) * dist };
}

function sideLabelPos(p1, p2, center, dist) {
  const mx = (p1.x + p2.x) / 2;
  const my = (p1.y + p2.y) / 2;
  const dx = mx - center.x;
  const dy = my - center.y;
  const len = Math.sqrt(dx * dx + dy * dy) || 1;
  return { x: mx + (dx / len) * dist, y: my + (dy / len) * dist };
}

function TriangleDiagram({ result }) {
  const defaultVerts = { A: { x: 150, y: 30 }, B: { x: 30, y: 220 }, C: { x: 270, y: 220 } };
  const verts = useMemo(() => computeVertices(result) || defaultVerts, [result]);

  const { A: vA, B: vB, C: vC } = verts;
  const center = { x: (vA.x + vB.x + vC.x) / 3, y: (vA.y + vB.y + vC.y) / 3 };

  const aLabel = sideLabelPos(vB, vC, center, 18);
  const bLabel = sideLabelPos(vA, vC, center, 18);
  const cLabel = sideLabelPos(vA, vB, center, 18);

  const AL = labelOffset(vA, center, 18);
  const BL = labelOffset(vB, center, 18);
  const CL = labelOffset(vC, center, 18);

  return (
    <View style={styles.diagramCard}>
      <Svg height={VB_H} width={VB_W} viewBox={`0 0 ${VB_W} ${VB_H}`} style={styles.diagramSvg}>
        <Polygon
          points={`${vA.x},${vA.y} ${vB.x},${vB.y} ${vC.x},${vC.y}`}
          fill="#EFF6FF"
          stroke="#2563EB"
          strokeWidth={2.5}
          strokeLinejoin="round"
        />

        {/* Side labels */}
        <SvgText x={aLabel.x} y={aLabel.y} fontSize={17} fontWeight="700" fill="#2563EB" textAnchor="middle" alignmentBaseline="central">a</SvgText>
        <SvgText x={bLabel.x} y={bLabel.y} fontSize={17} fontWeight="700" fill="#2563EB" textAnchor="middle" alignmentBaseline="central">b</SvgText>
        <SvgText x={cLabel.x} y={cLabel.y} fontSize={17} fontWeight="700" fill="#2563EB" textAnchor="middle" alignmentBaseline="central">c</SvgText>

        {/* Angle labels */}
        <SvgText x={AL.x} y={AL.y} fontSize={15} fontWeight="600" fill="#1E293B" textAnchor="middle" alignmentBaseline="central">A</SvgText>
        <SvgText x={BL.x} y={BL.y} fontSize={15} fontWeight="600" fill="#1E293B" textAnchor="middle" alignmentBaseline="central">B</SvgText>
        <SvgText x={CL.x} y={CL.y} fontSize={15} fontWeight="600" fill="#1E293B" textAnchor="middle" alignmentBaseline="central">C</SvgText>

        {/* Vertex dots */}
        <Circle cx={vA.x} cy={vA.y} r={4} fill="#2563EB" />
        <Circle cx={vB.x} cy={vB.y} r={4} fill="#2563EB" />
        <Circle cx={vC.x} cy={vC.y} r={4} fill="#2563EB" />
      </Svg>
    </View>
  );
}

const FIELDS = [
  { key: 'a', label: 'Side a', type: 'side' },
  { key: 'b', label: 'Side b', type: 'side' },
  { key: 'c', label: 'Side c', type: 'side' },
  { key: 'A', label: 'Angle A', type: 'angle', hint: 'opposite a' },
  { key: 'B', label: 'Angle B', type: 'angle', hint: 'opposite b' },
  { key: 'C', label: 'Angle C', type: 'angle', hint: 'opposite c' },
];

export default function App() {
  const [inputs, setInputs] = useState({ a: '', b: '', c: '', A: '', B: '', C: '' });
  const [result, setResult] = useState(null);

  const handleChange = useCallback((key, value) => {
    // Allow digits, decimal point, and empty string
    if (value !== '' && !/^\d*\.?\d*$/.test(value)) return;
    setInputs(prev => ({ ...prev, [key]: value }));
  }, []);

  const handleSolve = useCallback(() => {
    setResult(solveTriangle(inputs));
  }, [inputs]);

  const handleClear = useCallback(() => {
    setInputs({ a: '', b: '', c: '', A: '', B: '', C: '' });
    setResult(null);
  }, []);

  const filledCount = Object.values(inputs).filter(v => v !== '').length;

  return (
    <SafeAreaView style={styles.flex}>
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        style={styles.flex}
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
      >
        <StatusBar style="dark" />

        <View style={styles.header}>
          <Text style={styles.title}>Triangle Calculator</Text>
          <Text style={styles.subtitle}>Enter any 3 values to solve</Text>
        </View>

        <TriangleDiagram result={result} />

        {/* Input Section */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Sides</Text>
          <View style={styles.row}>
            {FIELDS.filter(f => f.type === 'side').map(f => (
              <View key={f.key} style={styles.inputGroup}>
                <Text style={styles.inputLabel}>{f.label}</Text>
                <TextInput
                  style={[styles.input, inputs[f.key] !== '' && styles.inputFilled]}
                  value={inputs[f.key]}
                  onChangeText={v => handleChange(f.key, v)}
                  keyboardType="decimal-pad"
                  placeholder="—"
                  placeholderTextColor="#999"
                />
              </View>
            ))}
          </View>

          <Text style={[styles.sectionTitle, { marginTop: 16 }]}>Angles (degrees)</Text>
          <View style={styles.row}>
            {FIELDS.filter(f => f.type === 'angle').map(f => (
              <View key={f.key} style={styles.inputGroup}>
                <Text style={styles.inputLabel}>{f.label}</Text>
                <Text style={styles.inputHint}>{f.hint}</Text>
                <TextInput
                  style={[styles.input, inputs[f.key] !== '' && styles.inputFilled]}
                  value={inputs[f.key]}
                  onChangeText={v => handleChange(f.key, v)}
                  keyboardType="decimal-pad"
                  placeholder="—"
                  placeholderTextColor="#999"
                />
              </View>
            ))}
          </View>
        </View>

        {/* Buttons */}
        <View style={styles.buttonRow}>
          <TouchableOpacity
            style={[styles.button, styles.solveButton, filledCount !== 3 && styles.buttonDisabled]}
            onPress={handleSolve}
            disabled={filledCount !== 3}
          >
            <Text style={styles.buttonText}>Solve</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.button, styles.clearButton]} onPress={handleClear}>
            <Text style={[styles.buttonText, styles.clearButtonText]}>Clear</Text>
          </TouchableOpacity>
        </View>

        {/* Results */}
        {result && (
          <View style={styles.card}>
            {result.error ? (
              <View style={styles.errorBox}>
                <Text style={styles.errorText}>{result.error}</Text>
              </View>
            ) : (
              <>
                <View style={styles.caseBadge}>
                  <Text style={styles.caseBadgeText}>{result.case}</Text>
                </View>

                <Text style={styles.sectionTitle}>Sides</Text>
                <View style={styles.resultRow}>
                  <ResultItem label="a" value={result.a} />
                  <ResultItem label="b" value={result.b} />
                  <ResultItem label="c" value={result.c} />
                </View>

                <Text style={[styles.sectionTitle, { marginTop: 12 }]}>Angles</Text>
                <View style={styles.resultRow}>
                  <ResultItem label="A" value={`${result.A}\u00B0`} />
                  <ResultItem label="B" value={`${result.B}\u00B0`} />
                  <ResultItem label="C" value={`${result.C}\u00B0`} />
                </View>

                <View style={styles.divider} />
                <View style={styles.resultRow}>
                  <ResultItem label="Area" value={result.area} />
                  <ResultItem label="Perimeter" value={result.perimeter} />
                </View>

                {result.note && (
                  <View style={styles.noteBox}>
                    <Text style={styles.noteText}>{result.note}</Text>
                  </View>
                )}
              </>
            )}
          </View>
        )}

        <View style={styles.footer}>
          <Text style={styles.footerText}>Made by WhoaStra Survey</Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function ResultItem({ label, value }) {
  return (
    <View style={styles.resultItem}>
      <Text style={styles.resultLabel}>{label}</Text>
      <Text style={styles.resultValue}>{value}</Text>
    </View>
  );
}

const BLUE = '#2563EB';
const DARK = '#1E293B';
const GRAY_BG = '#F1F5F9';

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: GRAY_BG },
  container: {
    padding: 20,
    paddingTop: Platform.OS === 'android' ? 36 : 12,
  },
  header: {
    marginBottom: 20,
    alignItems: 'center',
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    color: DARK,
  },
  subtitle: {
    fontSize: 14,
    color: '#64748B',
    marginTop: 4,
  },
  diagramCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 12,
    marginBottom: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  diagramSvg: {
    alignSelf: 'center',
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#94A3B8',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 10,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  inputGroup: {
    flex: 1,
    marginHorizontal: 4,
    alignItems: 'center',
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: DARK,
    marginBottom: 2,
  },
  inputHint: {
    fontSize: 11,
    color: '#94A3B8',
    marginBottom: 4,
  },
  input: {
    width: '100%',
    height: 44,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
    textAlign: 'center',
    fontSize: 18,
    fontWeight: '500',
    color: DARK,
  },
  inputFilled: {
    borderColor: BLUE,
    backgroundColor: '#EFF6FF',
  },
  buttonRow: {
    flexDirection: 'row',
    marginBottom: 16,
    gap: 12,
  },
  button: {
    flex: 1,
    height: 50,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  solveButton: {
    backgroundColor: BLUE,
    flex: 2,
  },
  clearButton: {
    backgroundColor: '#fff',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    flex: 1,
  },
  buttonDisabled: {
    opacity: 0.4,
  },
  buttonText: {
    fontSize: 17,
    fontWeight: '700',
    color: '#fff',
  },
  clearButtonText: {
    color: '#64748B',
  },
  errorBox: {
    backgroundColor: '#FEF2F2',
    borderRadius: 10,
    padding: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#EF4444',
  },
  errorText: {
    color: '#DC2626',
    fontSize: 15,
    fontWeight: '500',
  },
  caseBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#DBEAFE',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginBottom: 14,
  },
  caseBadgeText: {
    color: BLUE,
    fontSize: 13,
    fontWeight: '700',
  },
  resultRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 4,
  },
  resultItem: {
    alignItems: 'center',
    flex: 1,
  },
  resultLabel: {
    fontSize: 13,
    color: '#94A3B8',
    fontWeight: '600',
    marginBottom: 2,
  },
  resultValue: {
    fontSize: 20,
    fontWeight: '700',
    color: DARK,
  },
  divider: {
    height: 1,
    backgroundColor: '#E2E8F0',
    marginVertical: 14,
  },
  noteBox: {
    backgroundColor: '#FFFBEB',
    borderRadius: 10,
    padding: 12,
    marginTop: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#F59E0B',
  },
  noteText: {
    color: '#92400E',
    fontSize: 13,
  },
  footer: {
    alignItems: 'center',
    paddingVertical: 24,
    marginTop: 8,
  },
  footerText: {
    fontSize: 13,
    color: '#94A3B8',
    fontWeight: '500',
  },
});
