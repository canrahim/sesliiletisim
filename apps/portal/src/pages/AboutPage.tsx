import { motion } from 'framer-motion';

function AboutPage() {
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
            <span className="gradient-text">AsforceS</span> Hakkında
          </h1>
          <p className="text-xl text-gray-600 mb-10">
            Kurumsal iletişimi yeniden tanımlıyoruz
          </p>
        </motion.div>

        {/* About content will be added here */}
        <div className="mt-16">
          <p className="text-center text-gray-500">Hakkımızda sayfası içeriği yakında eklenecek...</p>
        </div>
      </div>
    </div>
  );
}

export default AboutPage;
