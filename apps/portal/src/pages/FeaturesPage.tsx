import { motion } from 'framer-motion';

function FeaturesPage() {
  return (
    <div className="pt-32 pb-20">
      <div className="container-max section-padding">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="max-w-4xl mx-auto text-center"
        >
          <h1 className="text-5xl font-bold mb-6">
            Güçlü <span className="gradient-text">Özellikler</span>
          </h1>
          <p className="text-xl text-gray-600 mb-10">
            AsforceS Voice ile ekibinizin iletişimini bir üst seviyeye taşıyın
          </p>
        </motion.div>

        {/* Features content will be added here */}
        <div className="mt-16">
          <p className="text-center text-gray-500">Özellikler sayfası içeriği yakında eklenecek...</p>
        </div>
      </div>
    </div>
  );
}

export default FeaturesPage;
