import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../app/generated/prisma/client";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

const CATEGORIES = [
  { name: "Ciencia", icon: "🔬", color: "#6366f1", description: "Física, química, biología y más" },
  { name: "Historia", icon: "📜", color: "#f59e0b", description: "Eventos y personajes históricos" },
  { name: "Deportes", icon: "⚽", color: "#10b981", description: "Fútbol, olimpiadas y atletismo" },
  { name: "Arte", icon: "🎨", color: "#ec4899", description: "Pintura, música y literatura" },
  { name: "Tecnología", icon: "💻", color: "#3b82f6", description: "Computación, internet e innovación" },
];

const QUESTIONS: Record<string, { text: string; options: string[]; correct: number; difficulty: "EASY" | "MEDIUM" | "HARD" }[]> = {
  Ciencia: [
    { text: "¿Cuál es el símbolo químico del oro?", options: ["Ag", "Au", "Fe", "Cu", "Pb"], correct: 1, difficulty: "EASY" },
    { text: "¿Cuántos huesos tiene el cuerpo humano adulto?", options: ["186", "196", "206", "216", "226"], correct: 2, difficulty: "MEDIUM" },
    { text: "¿A qué velocidad viaja la luz en el vacío?", options: ["200.000 km/s", "250.000 km/s", "299.792 km/s", "310.000 km/s", "350.000 km/s"], correct: 2, difficulty: "MEDIUM" },
    { text: "¿Cuál es la partícula subatómica con carga negativa?", options: ["Protón", "Neutrón", "Quark", "Electrón", "Positrón"], correct: 3, difficulty: "EASY" },
    { text: "¿Qué gas produce las plantas durante la fotosíntesis?", options: ["CO₂", "N₂", "H₂", "O₂", "He"], correct: 3, difficulty: "EASY" },
    { text: "¿Cuál es el número atómico del carbono?", options: ["4", "6", "8", "10", "12"], correct: 1, difficulty: "MEDIUM" },
    { text: "¿Quién formuló la teoría de la relatividad especial?", options: ["Newton", "Bohr", "Heisenberg", "Planck", "Einstein"], correct: 4, difficulty: "EASY" },
    { text: "¿Cuál es la temperatura del núcleo del Sol?", options: ["1 millón °C", "5 millones °C", "15 millones °C", "50 millones °C", "100 millones °C"], correct: 2, difficulty: "HARD" },
    { text: "¿Qué ley describe la relación entre presión y volumen de un gas?", options: ["Ley de Charles", "Ley de Boyle", "Ley de Gay-Lussac", "Ley de Dalton", "Ley de Avogadro"], correct: 1, difficulty: "HARD" },
    { text: "¿En qué año se descubrió el ADN?", options: ["1943", "1953", "1963", "1973", "1983"], correct: 1, difficulty: "MEDIUM" },
    { text: "¿Cuál es el elemento más abundante en el universo?", options: ["Oxígeno", "Carbono", "Hidrógeno", "Helio", "Nitrógeno"], correct: 2, difficulty: "EASY" },
    { text: "¿Qué planeta tiene los anillos más grandes del sistema solar?", options: ["Júpiter", "Urano", "Neptuno", "Saturno", "Marte"], correct: 3, difficulty: "EASY" },
  ],
  Historia: [
    { text: "¿En qué año comenzó la Primera Guerra Mundial?", options: ["1910", "1912", "1914", "1916", "1918"], correct: 2, difficulty: "EASY" },
    { text: "¿Quién fue el primer presidente de los Estados Unidos?", options: ["Abraham Lincoln", "Thomas Jefferson", "John Adams", "George Washington", "James Madison"], correct: 3, difficulty: "EASY" },
    { text: "¿En qué año cayó el Muro de Berlín?", options: ["1985", "1987", "1989", "1991", "1993"], correct: 2, difficulty: "MEDIUM" },
    { text: "¿Cuál fue el primer país en otorgar el voto a la mujer?", options: ["Australia", "Finlandia", "Nueva Zelanda", "Suecia", "Noruega"], correct: 2, difficulty: "HARD" },
    { text: "¿Quién conquistó el Imperio Azteca?", options: ["Francisco Pizarro", "Hernán Cortés", "Diego de Almagro", "Bartolomé de las Casas", "Cristóbal Colón"], correct: 1, difficulty: "EASY" },
    { text: "¿En qué año llegó el hombre a la Luna por primera vez?", options: ["1965", "1967", "1969", "1971", "1973"], correct: 2, difficulty: "EASY" },
    { text: "¿Cuánto duró el Imperio Romano?", options: ["500 años", "700 años", "1000 años", "1200 años", "1500 años"], correct: 2, difficulty: "HARD" },
    { text: "¿Quién fue Cleopatra?", options: ["Faraona griega de Egipto", "Reina romana", "Emperatriz persa", "Sultana otomana", "Reina cartaginesa"], correct: 0, difficulty: "MEDIUM" },
    { text: "¿En qué año se firmó la Declaración de Independencia de EE.UU.?", options: ["1773", "1774", "1775", "1776", "1777"], correct: 3, difficulty: "EASY" },
    { text: "¿Quién fue el líder de la Revolución Bolchevique?", options: ["Stalin", "Trotsky", "Lenin", "Kerensky", "Zinoviev"], correct: 2, difficulty: "MEDIUM" },
    { text: "¿Cuál fue la capital del Imperio Inca?", options: ["Lima", "Machu Picchu", "Cuzco", "Quito", "Bogotá"], correct: 2, difficulty: "MEDIUM" },
    { text: "¿En qué siglo ocurrió la Revolución Francesa?", options: ["XVI", "XVII", "XVIII", "XIX", "XX"], correct: 2, difficulty: "EASY" },
  ],
  Deportes: [
    { text: "¿Cuántos jugadores tiene un equipo de fútbol en cancha?", options: ["9", "10", "11", "12", "13"], correct: 2, difficulty: "EASY" },
    { text: "¿En qué año se fundó la FIFA?", options: ["1894", "1900", "1904", "1908", "1912"], correct: 2, difficulty: "HARD" },
    { text: "¿Cuántos aros tiene la bandera olímpica?", options: ["3", "4", "5", "6", "7"], correct: 2, difficulty: "EASY" },
    { text: "¿Qué país ha ganado más Copas del Mundo de fútbol?", options: ["Alemania", "Italia", "Argentina", "Brasil", "Francia"], correct: 3, difficulty: "EASY" },
    { text: "¿Cuántos sets se juegan en una final de tenis Grand Slam masculino?", options: ["3", "4", "5", "6", "7"], correct: 2, difficulty: "MEDIUM" },
    { text: "¿Cuál es la distancia oficial de un maratón?", options: ["40 km", "41,195 km", "42,195 km", "43 km", "44 km"], correct: 2, difficulty: "MEDIUM" },
    { text: "¿En qué deporte se usa el término 'birdie'?", options: ["Tenis", "Polo", "Golf", "Cricket", "Béisbol"], correct: 2, difficulty: "EASY" },
    { text: "¿Dónde se celebraron los primeros Juegos Olímpicos modernos?", options: ["París", "Londres", "Roma", "Atenas", "Berlín"], correct: 3, difficulty: "MEDIUM" },
    { text: "¿Cuántos jugadores participan en un partido de baloncesto por equipo?", options: ["4", "5", "6", "7", "8"], correct: 1, difficulty: "EASY" },
    { text: "¿Cuánto mide una piscina olímpica?", options: ["40 m", "45 m", "50 m", "55 m", "60 m"], correct: 2, difficulty: "MEDIUM" },
    { text: "¿Quién tiene más títulos de Grand Slam en la historia del tenis masculino?", options: ["Pete Sampras", "Roger Federer", "Rafael Nadal", "Novak Djokovic", "Andre Agassi"], correct: 3, difficulty: "MEDIUM" },
    { text: "¿En qué país se originó el judo?", options: ["China", "Corea", "Japón", "Mongolia", "Tailandia"], correct: 2, difficulty: "EASY" },
  ],
  Arte: [
    { text: "¿Quién pintó la Mona Lisa?", options: ["Rafael", "Botticelli", "Miguel Ángel", "Donatello", "Leonardo da Vinci"], correct: 4, difficulty: "EASY" },
    { text: "¿En qué museo se exhibe La Gioconda?", options: ["Prado", "Uffizi", "Louvre", "Metropolitan", "Rijksmuseum"], correct: 2, difficulty: "MEDIUM" },
    { text: "¿Quién compuso la Quinta Sinfonía?", options: ["Mozart", "Bach", "Beethoven", "Schubert", "Haydn"], correct: 2, difficulty: "EASY" },
    { text: "¿Quién escribió Don Quijote de la Mancha?", options: ["Lope de Vega", "Quevedo", "Cervantes", "Góngora", "Calderón"], correct: 2, difficulty: "EASY" },
    { text: "¿Qué movimiento artístico lideró Salvador Dalí?", options: ["Cubismo", "Impresionismo", "Surrealismo", "Dadaísmo", "Expresionismo"], correct: 2, difficulty: "MEDIUM" },
    { text: "¿Quién esculpió El Pensador?", options: ["Bernini", "Rodin", "Brancusi", "Giacometti", "Calder"], correct: 1, difficulty: "MEDIUM" },
    { text: "¿Cuándo nació Pablo Picasso?", options: ["1871", "1881", "1891", "1901", "1911"], correct: 1, difficulty: "HARD" },
    { text: "¿Qué instrumento tocaba Ludwig van Beethoven principalmente?", options: ["Violín", "Cello", "Flauta", "Piano", "Órgano"], correct: 3, difficulty: "EASY" },
    { text: "¿Quién escribió Cien años de soledad?", options: ["Vargas Llosa", "Cortázar", "Borges", "García Márquez", "Rulfo"], correct: 3, difficulty: "EASY" },
    { text: "¿Qué artista holandés cortó su propia oreja?", options: ["Vermeer", "Rembrandt", "Mondrian", "Van Gogh", "Escher"], correct: 3, difficulty: "EASY" },
    { text: "¿En qué ciudad está la Capilla Sixtina?", options: ["Florencia", "Milán", "Nápoles", "Venecia", "Roma"], correct: 4, difficulty: "EASY" },
    { text: "¿Quién compuso La Flauta Mágica?", options: ["Handel", "Haydn", "Mozart", "Vivaldi", "Monteverdi"], correct: 2, difficulty: "MEDIUM" },
  ],
  Tecnología: [
    { text: "¿En qué año se fundó Apple?", options: ["1972", "1974", "1976", "1978", "1980"], correct: 2, difficulty: "MEDIUM" },
    { text: "¿Quién creó el lenguaje de programación Python?", options: ["James Gosling", "Dennis Ritchie", "Linus Torvalds", "Guido van Rossum", "Bjarne Stroustrup"], correct: 3, difficulty: "MEDIUM" },
    { text: "¿Qué significa HTML?", options: ["HyperText Markup Language", "HyperText Machine Language", "High Transfer Markup Language", "HyperText Modeling Language", "HyperText Management Language"], correct: 0, difficulty: "EASY" },
    { text: "¿Quién fundó Microsoft?", options: ["Steve Jobs", "Larry Page", "Mark Zuckerberg", "Elon Musk", "Bill Gates"], correct: 4, difficulty: "EASY" },
    { text: "¿Cuántos bits tiene un byte?", options: ["4", "6", "8", "10", "16"], correct: 2, difficulty: "EASY" },
    { text: "¿En qué año se lanzó el primer iPhone?", options: ["2005", "2006", "2007", "2008", "2009"], correct: 2, difficulty: "MEDIUM" },
    { text: "¿Cuál es la red social con más usuarios en el mundo?", options: ["Instagram", "TikTok", "YouTube", "Facebook", "WhatsApp"], correct: 3, difficulty: "EASY" },
    { text: "¿Qué significa CPU?", options: ["Central Processing Unit", "Core Program Unit", "Computer Power Unit", "Central Program Utility", "Core Processing Unit"], correct: 0, difficulty: "EASY" },
    { text: "¿Quién inventó el World Wide Web?", options: ["Bill Gates", "Alan Turing", "Tim Berners-Lee", "Vint Cerf", "Steve Jobs"], correct: 2, difficulty: "MEDIUM" },
    { text: "¿Qué compañía desarrolló el sistema operativo Android?", options: ["Apple", "Microsoft", "Samsung", "Google", "Meta"], correct: 3, difficulty: "EASY" },
    { text: "¿Cuál es el lenguaje de programación más usado en el backend de Facebook?", options: ["Java", "Python", "PHP", "C++", "Go"], correct: 2, difficulty: "HARD" },
    { text: "¿Qué significa RAM?", options: ["Random Access Memory", "Read All Memory", "Rapid Access Module", "Random Array Memory", "Real Access Memory"], correct: 0, difficulty: "EASY" },
  ],
};

const USERS = [
  {
    email: "admin@versus.com",
    username: "admin123",
    password: "admin123",
    displayName: "Administrador",
    role: "ADMIN" as const,
  },
  {
    email: "mod@versus.com",
    username: "moderador",
    password: "mod12345",
    displayName: "Moderador",
    role: "MODERATOR" as const,
  },
  {
    email: "jugador1@versus.com",
    username: "jugador1",
    password: "jugador123",
    displayName: "Jugador Uno",
    role: "PLAYER" as const,
  },
  {
    email: "jugador2@versus.com",
    username: "jugador2",
    password: "jugador123",
    displayName: "Jugador Dos",
    role: "PLAYER" as const,
  },
];

async function main() {
  console.log("🌱 Iniciando seed...");

  // Usuarios
  for (const u of USERS) {
    const hash = await bcrypt.hash(u.password, 10);
    const user = await prisma.user.upsert({
      where: { email: u.email },
      update: { role: u.role },
      create: {
        email: u.email,
        username: u.username,
        password: hash,
        role: u.role,
        twoFactorVerifiedAt: new Date(), // gracia 2FA para poder entrar sin email
      },
    });
    await prisma.player.upsert({
      where: { userId: user.id },
      update: {},
      create: { userId: user.id, displayName: u.displayName },
    });
    console.log(`  ✓ ${u.role.padEnd(10)} @${u.username}  (pass: ${u.password})`);
  }
  console.log();

  // Categorías
  for (const cat of CATEGORIES) {
    const category = await prisma.category.upsert({
      where: { name: cat.name },
      update: { icon: cat.icon, color: cat.color, description: cat.description },
      create: cat,
    });

    const questions = QUESTIONS[cat.name] ?? [];
    for (const q of questions) {
      const existing = await prisma.question.findFirst({
        where: { text: q.text, categoryId: category.id },
      });
      if (existing) continue;

      await prisma.question.create({
        data: {
          text: q.text,
          categoryId: category.id,
          difficulty: q.difficulty,
          timeLimit: q.difficulty === "EASY" ? 20 : q.difficulty === "MEDIUM" ? 25 : 30,
          basePoints: q.difficulty === "EASY" ? 100 : q.difficulty === "MEDIUM" ? 150 : 200,
          options: {
            create: q.options.map((text, i) => ({
              text,
              order: i,
              isCorrect: i === q.correct,
            })),
          },
        },
      });
    }

    console.log(`  ✓ ${cat.icon} ${cat.name} (${questions.length} preguntas)`);
  }

  // Salas de prueba (las crea el admin)
  const adminPlayer = await prisma.player.findFirst({ where: { user: { username: "admin123" } } });
  if (adminPlayer) {
    const testRooms = [
      { code: "DEMO02", name: "Sala Demo 2 jugadores", maxPlayers: 2 },
      { code: "DEMO04", name: "Sala Demo 4 jugadores", maxPlayers: 4 },
    ];
    for (const r of testRooms) {
      await prisma.room.upsert({
        where: { code: r.code },
        update: {},
        create: { code: r.code, name: r.name, maxPlayers: r.maxPlayers, adminId: adminPlayer.id, status: "WAITING" },
      });
      console.log(`  ✓ Sala "${r.name}"  código: ${r.code}`);
    }
    console.log();
  }

  console.log("\n✅ Seed completado");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
