import { Card, CardContent } from "@/components/ui/card"
import { Users, Percent, Star, XCircle } from "lucide-react"
import { useTranslations } from "@/hooks/use-translations"

export function HowMembershipsWork() {
  const { t } = useTranslations()

  const features = [
    {
      icon: Percent,
      titleKey: "featureDiscountsTitle",
      descriptionKey: "featureDiscountsDescription"
    },
    {
      icon: Users,
      titleKey: "featureGuestsTitle",
      descriptionKey: "featureGuestsDescription"
    },
    {
      icon: Star,
      titleKey: "featureExclusiveTitle",
      descriptionKey: "featureExclusiveDescription"
    },
    {
      icon: XCircle,
      titleKey: "featureCancelTitle",
      descriptionKey: "featureCancelDescription"
    }
  ]

  return (
    <section className="py-16 bg-gray-50">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold mb-4 text-primary">
            {t('membership', 'howItWorksTitle')}
          </h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            {t('membership', 'howItWorksDescription')}
          </p>
        </div>

        <div className="text-center mb-12">
          <div className="bg-primary text-white rounded-lg p-8">
            <h3 className="text-xl font-bold mb-2">
              {t('membership', 'earlyBirdTitle')}
            </h3>
            <p className="mb-4">
              {t('membership', 'earlyBirdDescription')}
            </p>
            <p className="text-highlight font-semibold">
              {t('membership', 'earlyBirdLimited')}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          {features.map((feature, index) => (
            <Card key={index} className="text-center">
              <CardContent className="p-6">
                <feature.icon className="h-12 w-12 text-primary mx-auto mb-4" />
                <h3 className="text-xl font-semibold mb-2">
                  {t('membership', feature.titleKey)}
                </h3>
                <p className="text-gray-600">
                  {t('membership', feature.descriptionKey)}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  )
} 