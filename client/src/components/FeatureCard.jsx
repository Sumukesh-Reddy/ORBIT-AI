import { motion } from 'framer-motion'

export default function FeatureCard({ icon: Icon, title, description, gradient, delay = 0 }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 40 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-80px' }}
      transition={{ duration: 0.6, delay, ease: 'easeOut' }}
      whileHover={{ y: -6 }}
      className="card-feature group"
    >
      {/* Icon */}
      <div
        className={`w-12 h-12 rounded-xl flex items-center justify-center mb-5 ${gradient} relative`}
      >
        <div className="absolute inset-0 rounded-xl blur-md opacity-60 group-hover:opacity-100 transition-opacity duration-300" style={{ background: 'inherit' }} />
        <Icon className="w-6 h-6 text-white relative z-10" />
      </div>

      {/* Content */}
      <h3 className="font-display font-semibold text-lg text-white mb-2 group-hover:text-blue-300 transition-colors duration-300">
        {title}
      </h3>
      <p className="text-sm text-white/50 leading-relaxed">
        {description}
      </p>

      {/* Bottom shimmer line */}
      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-blue-500/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
    </motion.div>
  )
}
