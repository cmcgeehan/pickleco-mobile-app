import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
} from 'react-native';

interface FAQItem {
  question: string;
  answer: string;
}

export default function MembershipFAQ() {
  const [expandedItems, setExpandedItems] = useState<Set<number>>(new Set());

  const faqs: FAQItem[] = [
    {
      question: "How does billing work?",
      answer: "Memberships are billed monthly on the same date you signed up. You can update your payment method or cancel anytime in your account settings."
    },
    {
      question: "What's the Early Bird special?",
      answer: "New members get 50% off their first month when they sign up during our Early Bird promotion period. This offer is limited time and subject to availability."
    },
    {
      question: "Can I switch between membership plans?",
      answer: "Yes! You can upgrade or downgrade your membership at any time. Changes take effect at your next billing cycle, and we'll prorate any differences."
    },
    {
      question: "What's your refund policy?",
      answer: "We offer a 30-day satisfaction guarantee. If you're not happy with your membership in the first 30 days, we'll provide a full refund."
    },
    {
      question: "Are there any additional fees?",
      answer: "No hidden fees! Your membership includes everything listed in your plan. The only additional costs would be optional add-ons you choose."
    },
    {
      question: "Can I use my membership at different locations?",
      answer: "Yes! Your membership gives you access to all our locations. You can book courts and attend events at any of our facilities."
    },
    {
      question: "What if I'm not satisfied?",
      answer: "We're confident you'll love your membership! If you're not completely satisfied, contact us within 30 days for a full refund, no questions asked."
    }
  ];

  const toggleItem = (index: number) => {
    setExpandedItems(prev => {
      const newSet = new Set(prev);
      if (newSet.has(index)) {
        newSet.delete(index);
      } else {
        newSet.add(index);
      }
      return newSet;
    });
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Frequently Asked Questions</Text>
        <Text style={styles.subtitle}>
          Got questions? We've got answers to help you make the best choice.
        </Text>
      </View>

      <View style={styles.faqList}>
        {faqs.map((faq, index) => (
          <View key={index} style={styles.faqItem}>
            <TouchableOpacity
              style={styles.questionButton}
              onPress={() => toggleItem(index)}
              activeOpacity={0.7}
            >
              <Text style={styles.questionText}>{faq.question}</Text>
              <Text style={[
                styles.chevron,
                expandedItems.has(index) && styles.chevronExpanded
              ]}>
                ▼
              </Text>
            </TouchableOpacity>
            
            {expandedItems.has(index) && (
              <View style={styles.answerContainer}>
                <Text style={styles.answerText}>{faq.answer}</Text>
              </View>
            )}
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#f8fafc',
    paddingVertical: 32,
    paddingHorizontal: 20,
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#2A62A2',
    textAlign: 'center',
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 16,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 24,
  },
  faqList: {
    gap: 8,
  },
  faqItem: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  questionButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
  },
  questionText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
    flex: 1,
    marginRight: 16,
  },
  chevron: {
    fontSize: 12,
    color: '#64748b',
    transform: [{ rotate: '0deg' }],
  },
  chevronExpanded: {
    transform: [{ rotate: '180deg' }],
  },
  answerContainer: {
    paddingHorizontal: 20,
    paddingBottom: 20,
    paddingTop: 0,
  },
  answerText: {
    fontSize: 14,
    color: '#64748b',
    lineHeight: 20,
  },
});