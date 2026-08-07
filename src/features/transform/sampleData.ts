const sampleData = {
  stats: {
    daysTraining: 134,
    startWeight: 82,
    currentWeight: 75,
    weightLost: 7,
    currentStreak: 12,
    totalWorkouts: 98,
    longestStreak: 21,
    xp: 12450,
    photosUploaded: 8,
    rank: "Silver",
  },
  photos: [
    { id: "p1", url: "https://via.placeholder.com/900x900?text=Week+1", label: "Week 1", weekLabel: "Week 1", weight: 82, bodyFat: 24, note: "Finally committed." },
    { id: "p2", url: "https://via.placeholder.com/900x900?text=Week+4", label: "Week 4", weekLabel: "Week 4", weight: 79, bodyFat: 22, note: "Feeling stronger." },
    { id: "p3", url: "https://via.placeholder.com/900x900?text=Week+12", label: "Week 12", weekLabel: "Week 12", weight: 75, bodyFat: 18, note: "Best I've ever looked." },
    { id: "p4", url: "https://via.placeholder.com/900x900?text=Week+20", label: "Week 20", weekLabel: "Week 20", weight: 74, bodyFat: 17, note: "Consistency." },
  ]
} as const;

export default sampleData;
