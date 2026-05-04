/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          asistencia: '#FF7F50', // Coral / Naranja suave
          turnos: '#87CEEB',     // Azul cielo / Lavanda (#E6E6FA)
          pagos: '#9DC183',      // Verde Salvia
        }
      }
    },
  },
  plugins: [],
}
