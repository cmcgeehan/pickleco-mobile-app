import React, { useState } from 'react';
import {
  TouchableOpacity,
  Text,
  View,
  Modal,
  StyleSheet,
  Pressable,
} from 'react-native';
import { useLanguage } from '../contexts/LanguageContext';
import { useTranslation } from 'react-i18next';

export default function LanguageSwitcher() {
  const { language, setLanguage, isChangingLanguage } = useLanguage();
  const [showDropdown, setShowDropdown] = useState(false);
  const { t } = useTranslation();

  const handleLanguageChange = async (lang: 'en' | 'es') => {
    setShowDropdown(false);
    if (lang !== language) {
      await setLanguage(lang);
    }
  };

  return (
    <>
      <TouchableOpacity 
        style={styles.languageSwitcher}
        onPress={() => setShowDropdown(true)}
        disabled={isChangingLanguage}
      >
        <Text style={styles.languageText}>
          {language.toUpperCase()}
        </Text>
        <Text style={styles.languageArrow}>▼</Text>
      </TouchableOpacity>

      <Modal
        visible={showDropdown}
        transparent
        animationType="fade"
        onRequestClose={() => setShowDropdown(false)}
      >
        <Pressable 
          style={styles.modalOverlay}
          onPress={() => setShowDropdown(false)}
        >
          <View style={styles.dropdown}>
            <TouchableOpacity
              style={[
                styles.dropdownItem,
                language === 'en' && styles.selectedItem
              ]}
              onPress={() => handleLanguageChange('en')}
            >
              <Text style={[
                styles.dropdownText,
                language === 'en' && styles.selectedText
              ]}>
                English
              </Text>
            </TouchableOpacity>
            
            <View style={styles.divider} />
            
            <TouchableOpacity
              style={[
                styles.dropdownItem,
                language === 'es' && styles.selectedItem
              ]}
              onPress={() => handleLanguageChange('es')}
            >
              <Text style={[
                styles.dropdownText,
                language === 'es' && styles.selectedText
              ]}>
                Español
              </Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  languageSwitcher: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#f0f0f0',
    borderRadius: 20,
  },
  languageText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2A62A2',
    marginRight: 4,
  },
  languageArrow: {
    fontSize: 10,
    color: '#2A62A2',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    justifyContent: 'flex-start',
    alignItems: 'flex-end',
    paddingTop: 100,
    paddingRight: 20,
  },
  dropdown: {
    backgroundColor: 'white',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
    minWidth: 120,
  },
  dropdownItem: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  selectedItem: {
    backgroundColor: '#f0f7ff',
  },
  dropdownText: {
    fontSize: 16,
    color: '#333',
  },
  selectedText: {
    color: '#2A62A2',
    fontWeight: '600',
  },
  divider: {
    height: 1,
    backgroundColor: '#e0e0e0',
  },
});