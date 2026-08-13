module.exports = {
  businessName: 'Olu-Deb Hair Place',
  contactEmail: 'Olujaye92@gmail.com',
  // 0 = Sunday, 1 = Monday, ... 6 = Saturday
  openDays: [1, 2, 3, 4, 5, 6],
  openTime: '10:00',
  closeTime: '18:00',
  slotIncrementMinutes: 30,
  services: [
    { id: 'knotless-braids', name: 'Knotless Braids', price: 150, durationMinutes: 360 },
    { id: 'box-braids', name: 'Box Braids', price: 130, durationMinutes: 300 },
    { id: 'cornrows', name: 'Cornrows', price: 50, durationMinutes: 120 },
    { id: 'didi', name: 'Didi', price: 70, durationMinutes: 120 },
    { id: 'crochet', name: 'Crochet', price: 100, durationMinutes: 120 },
    { id: 'natural-braids-twist', name: 'Natural Braids/Twist', price: 70, durationMinutes: 120 }
  ]
};
