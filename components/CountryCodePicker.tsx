import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  FlatList,
  StyleSheet,
  TextInput,
  SafeAreaView,
} from 'react-native';

export interface Country {
  id: string;
  name: string;
  code: string;
  flag: string;
  format: string;
}

const COUNTRIES: Country[] = [
  { id: 'mx', name: 'Mexico', code: '+52', flag: '🇲🇽', format: 'XX XXXX XXXX' },
  { id: 'us', name: 'United States', code: '+1', flag: '🇺🇸', format: '(XXX) XXX-XXXX' },
  { id: 'ca', name: 'Canada', code: '+1', flag: '🇨🇦', format: '(XXX) XXX-XXXX' },
  { id: 'gb', name: 'United Kingdom', code: '+44', flag: '🇬🇧', format: 'XXXX XXXXXX' },
  { id: 'es', name: 'Spain', code: '+34', flag: '🇪🇸', format: 'XXX XXX XXX' },
  { id: 'fr', name: 'France', code: '+33', flag: '🇫🇷', format: 'X XX XX XX XX' },
  { id: 'de', name: 'Germany', code: '+49', flag: '🇩🇪', format: 'XXX XXXXXXXX' },
  { id: 'it', name: 'Italy', code: '+39', flag: '🇮🇹', format: 'XXX XXX XXXX' },
  { id: 'br', name: 'Brazil', code: '+55', flag: '🇧🇷', format: '(XX) XXXXX-XXXX' },
  { id: 'ar', name: 'Argentina', code: '+54', flag: '🇦🇷', format: '(XX) XXXX-XXXX' },
  { id: 'co', name: 'Colombia', code: '+57', flag: '🇨🇴', format: 'XXX XXX XXXX' },
  { id: 'pe', name: 'Peru', code: '+51', flag: '🇵🇪', format: 'XXX XXX XXX' },
  { id: 'cl', name: 'Chile', code: '+56', flag: '🇨🇱', format: 'X XXXX XXXX' },
  { id: 'au', name: 'Australia', code: '+61', flag: '🇦🇺', format: 'X XXXX XXXX' },
  { id: 'jp', name: 'Japan', code: '+81', flag: '🇯🇵', format: 'XX XXXX XXXX' },
  { id: 'kr', name: 'South Korea', code: '+82', flag: '🇰🇷', format: 'XX XXXX XXXX' },
  { id: 'cn', name: 'China', code: '+86', flag: '🇨🇳', format: 'XXX XXXX XXXX' },
  { id: 'in', name: 'India', code: '+91', flag: '🇮🇳', format: 'XXXXX XXXXX' },
];

interface CountryCodePickerProps {
  selectedCountry: Country;
  onSelectCountry: (country: Country) => void;
  phoneNumber: string;
  onChangePhoneNumber: (number: string) => void;
  placeholder?: string;
  editable?: boolean;
}

export default function CountryCodePicker({
  selectedCountry,
  onSelectCountry,
  phoneNumber,
  onChangePhoneNumber,
  placeholder = 'Phone number',
  editable = true,
}: CountryCodePickerProps) {
  const [modalVisible, setModalVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const filteredCountries = COUNTRIES.filter(
    country =>
      country.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      country.code.includes(searchQuery)
  );

  const renderCountryItem = ({ item }: { item: Country }) => (
    <TouchableOpacity
      style={styles.countryItem}
      onPress={() => {
        onSelectCountry(item);
        setModalVisible(false);
        setSearchQuery('');
      }}
    >
      <Text style={styles.countryFlag}>{item.flag}</Text>
      <View style={styles.countryInfo}>
        <Text style={styles.countryName}>{item.name}</Text>
        <Text style={styles.countryCode}>{item.code}</Text>
      </View>
      {item.id === selectedCountry.id && (
        <Text style={styles.checkmark}>✓</Text>
      )}
    </TouchableOpacity>
  );

  const formatPhoneNumber = (text: string) => {
    // Remove any non-digit characters
    const cleaned = text.replace(/\D/g, '');
    return cleaned;
  };

  return (
    <View style={styles.container}>
      <View style={styles.inputContainer}>
        <TouchableOpacity
          style={styles.countrySelector}
          onPress={() => setModalVisible(true)}
          disabled={!editable}
        >
          <Text style={styles.flag}>{selectedCountry.flag}</Text>
          <Text style={styles.code}>{selectedCountry.code}</Text>
          <Text style={styles.arrow}>▼</Text>
        </TouchableOpacity>
        
        <TextInput
          style={styles.phoneInput}
          value={phoneNumber}
          onChangeText={(text) => onChangePhoneNumber(formatPhoneNumber(text))}
          placeholder={placeholder}
          placeholderTextColor="#64748B"
          keyboardType="phone-pad"
          editable={editable}
        />
      </View>
      
      <Text style={styles.formatHint}>
        Format: {selectedCountry.format.replace(/X/g, '0')}
      </Text>

      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => {
          setModalVisible(false);
          setSearchQuery('');
        }}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Country</Text>
              <TouchableOpacity
                onPress={() => {
                  setModalVisible(false);
                  setSearchQuery('');
                }}
                style={styles.closeButton}
              >
                <Text style={styles.closeButtonText}>✕</Text>
              </TouchableOpacity>
            </View>
            
            <View style={styles.searchContainer}>
              <TextInput
                style={styles.searchInput}
                placeholder="Search country or code..."
                placeholderTextColor="#64748B"
                value={searchQuery}
                onChangeText={setSearchQuery}
                autoCorrect={false}
              />
            </View>

            <FlatList
              data={filteredCountries}
              renderItem={renderCountryItem}
              keyExtractor={(item) => item.id}
              ItemSeparatorComponent={() => <View style={styles.separator} />}
              contentContainerStyle={styles.listContent}
            />
          </View>
        </SafeAreaView>
      </Modal>
    </View>
  );
}

// Export the default country (Mexico)
export const DEFAULT_COUNTRY = COUNTRIES[0];

// Helper function to get full phone number with country code
export const getFullPhoneNumber = (country: Country, phoneNumber: string): string => {
  if (!phoneNumber) return '';
  const cleaned = phoneNumber.replace(/\D/g, '');
  return `${country.code}${cleaned}`;
};

// Helper function to parse phone number with country code
export const parsePhoneNumber = (fullNumber: string): { country: Country; number: string } => {
  if (!fullNumber) return { country: DEFAULT_COUNTRY, number: '' };
  
  // Find matching country by code
  const country = COUNTRIES.find(c => fullNumber.startsWith(c.code));
  
  if (country) {
    const number = fullNumber.slice(country.code.length);
    return { country, number };
  }
  
  // Default to Mexico if no match
  return { country: DEFAULT_COUNTRY, number: fullNumber };
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    backgroundColor: '#ffffff',
  },
  countrySelector: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRightWidth: 1,
    borderRightColor: '#E2E8F0',
  },
  flag: {
    fontSize: 20,
    marginRight: 6,
  },
  code: {
    fontSize: 14,
    color: '#020817',
    fontWeight: '500',
    marginRight: 4,
  },
  arrow: {
    fontSize: 10,
    color: '#64748B',
  },
  phoneInput: {
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    color: '#020817',
  },
  formatHint: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 4,
    marginLeft: 4,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    flex: 1,
    backgroundColor: '#ffffff',
    marginTop: 100,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#020817',
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: 18,
    color: '#64748B',
  },
  searchContainer: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  searchInput: {
    backgroundColor: '#F8F9FA',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 14,
    color: '#020817',
  },
  listContent: {
    paddingBottom: 20,
  },
  countryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  countryFlag: {
    fontSize: 24,
    marginRight: 12,
  },
  countryInfo: {
    flex: 1,
  },
  countryName: {
    fontSize: 16,
    color: '#020817',
    fontWeight: '500',
  },
  countryCode: {
    fontSize: 14,
    color: '#64748B',
    marginTop: 2,
  },
  checkmark: {
    fontSize: 18,
    color: '#2A62A2',
    fontWeight: '600',
  },
  separator: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginLeft: 56,
  },
});