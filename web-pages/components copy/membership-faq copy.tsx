import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { useTranslations } from "@/hooks/use-translations"

export function MembershipFAQ() {
  const { t } = useTranslations()

  const faqs = [
    {
      questionKey: "faqBillingQuestion",
      answerKey: "faqBillingAnswer"
    },
    {
      questionKey: "faqEarlyBirdQuestion", 
      answerKey: "faqEarlyBirdAnswer"
    },
    {
      questionKey: "faqSwitchQuestion",
      answerKey: "faqSwitchAnswer"
    },
    {
      questionKey: "faqRefundQuestion",
      answerKey: "faqRefundAnswer"
    },
    {
      questionKey: "faqFeesQuestion",
      answerKey: "faqFeesAnswer"
    },
    {
      questionKey: "faqLocationsQuestion",
      answerKey: "faqLocationsAnswer"
    },
    {
      questionKey: "faqSatisfactionQuestion",
      answerKey: "faqSatisfactionAnswer"
    }
  ]

  return (
    <section className="py-16 bg-gray-50">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold mb-4 text-primary">
            {t('membership', 'faqTitle')}
          </h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            {t('membership', 'faqDescription')}
          </p>
        </div>

        <div className="max-w-3xl mx-auto">
          <Accordion type="single" collapsible className="space-y-4">
            {faqs.map((faq, index) => (
              <AccordionItem key={index} value={`item-${index}`} className="bg-white rounded-lg px-6">
                <AccordionTrigger className="text-left font-semibold">
                  {t('membership', faq.questionKey)}
                </AccordionTrigger>
                <AccordionContent className="text-gray-600 pt-2">
                  {t('membership', faq.answerKey)}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </div>
    </section>
  )
} 