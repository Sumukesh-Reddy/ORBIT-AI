import { useEffect, useRef } from 'react'

export default function StarBackground() {
  const canvasRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    let animId
    let stars = []
    let particles = []

    function resize() {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
    }

    function createStars() {
      stars = []
      const count = Math.floor((canvas.width * canvas.height) / 3000)
      for (let i = 0; i < count; i++) {
        stars.push({
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height,
          r: Math.random() * 1.8 + 0.2,
          alpha: Math.random(),
          alphaDir: Math.random() > 0.5 ? 1 : -1,
          speed: Math.random() * 0.008 + 0.002,
          color: Math.random() > 0.8
            ? `rgba(139,92,246,`
            : Math.random() > 0.6
            ? `rgba(96,165,250,`
            : `rgba(255,255,255,`,
        })
      }
    }

    function createParticles() {
      particles = []
      for (let i = 0; i < 6; i++) {
        particles.push({
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height,
          r: Math.random() * 120 + 60,
          alpha: Math.random() * 0.06 + 0.02,
          vx: (Math.random() - 0.5) * 0.2,
          vy: (Math.random() - 0.5) * 0.2,
          color: Math.random() > 0.5
            ? [59, 130, 246]
            : [139, 92, 246],
        })
      }
    }

    function drawStars() {
      stars.forEach(s => {
        s.alpha += s.alphaDir * s.speed
        if (s.alpha >= 1) { s.alpha = 1; s.alphaDir = -1 }
        if (s.alpha <= 0.1) { s.alpha = 0.1; s.alphaDir = 1 }

        ctx.beginPath()
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2)
        ctx.fillStyle = `${s.color}${s.alpha})`
        ctx.fill()
      })
    }

    function drawParticles() {
      particles.forEach(p => {
        p.x += p.vx
        p.y += p.vy

        if (p.x < -p.r) p.x = canvas.width + p.r
        if (p.x > canvas.width + p.r) p.x = -p.r
        if (p.y < -p.r) p.y = canvas.height + p.r
        if (p.y > canvas.height + p.r) p.y = -p.r

        const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r)
        grad.addColorStop(0, `rgba(${p.color[0]},${p.color[1]},${p.color[2]},${p.alpha})`)
        grad.addColorStop(1, 'rgba(0,0,0,0)')
        ctx.beginPath()
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2)
        ctx.fillStyle = grad
        ctx.fill()
      })
    }

    function animate() {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      drawParticles()
      drawStars()
      animId = requestAnimationFrame(animate)
    }

    resize()
    createStars()
    createParticles()
    animate()

    const onResize = () => {
      resize()
      createStars()
    }
    window.addEventListener('resize', onResize)

    return () => {
      cancelAnimationFrame(animId)
      window.removeEventListener('resize', onResize)
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none"
      style={{ zIndex: 0 }}
    />
  )
}
