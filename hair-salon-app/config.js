module.exports = {
  businessName: 'Olu Hair Place',
  contactEmail: 'Olujaye92@gmail.com',
  depositPercent: 0.3,
  interacEmail: 'Olujaye92@gmail.com',
  // 0 = Sunday, 1 = Monday, ... 6 = Saturday
  openDays: [1, 2, 3, 4, 5, 6],
  openTime: '10:00',
  closeTime: '18:00',
  slotIncrementMinutes: 30,
  policies: [
    {
      title: 'Deposit & Payment',
      text: 'A non-refundable, non-transferable booking deposit is required to secure your appointment. Please bring the remaining balance in cash. Interac e-Transfers for the remaining balance are subject to tax.'
    },
    {
      title: 'Late Arrivals',
      text: 'Please be considerate of our time. A 10 minute grace period is given. A $15 late fee applies after that. At 20 minutes late, your appointment will be cancelled and the deposit forfeited.'
    },
    {
      title: 'No Call, No Show',
      text: 'If you miss your appointment without contacting us, you will be blocked from booking with us in the future.'
    },
    {
      title: 'Cancellations',
      text: 'Need to cancel or reschedule? Let us know at least 48 hours ahead, otherwise your deposit will be forfeited.'
    },
    {
      title: 'No Guests',
      text: 'To keep focus and stay on schedule, please do not bring children or extra guests to your appointment.'
    },
    {
      title: 'Before Your Appointment',
      text: 'Please arrive with clean, detangled hair (washed and blow-dried) unless your stylist has told you otherwise.'
    }
  ],
  services: [
    { id: 'knotless-braids', name: 'Knotless Braids', price: 150, durationMinutes: 360 },
    { id: 'box-braids', name: 'Box Braids', price: 130, durationMinutes: 300 },
    { id: 'cornrows', name: 'Cornrows', price: 50, durationMinutes: 120 },
    { id: 'didi', name: 'Didi', price: 70, durationMinutes: 120 },
    { id: 'crochet', name: 'Crochet', price: 100, durationMinutes: 120 },
    { id: 'natural-braids-twist', name: 'Natural Braids/Twist', price: 70, durationMinutes: 120 }
  ]
};
