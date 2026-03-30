import { savePlans } from './localStore';

export interface TrainingDay {
  day: number;
  date: string;
  targetDistance: number;
  completed: boolean;
}

const ROUTE_DISTANCES: Record<string, number> = {
  'baiona': 78,
  'tui': 71,
  'porto': 150,
  'sarria': 71,
  'santiago': 0
};

export async function generateTrainingPlan(user: any, profile: any) {
  const { physicalBaseline, departureDate, startLocation, endDestination } = profile;
  
  const today = new Date();
  const departure = new Date(departureDate);
  const diffTime = Math.abs(departure.getTime() - today.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  const startKey = (startLocation || 'baiona').toLowerCase().trim();
  const endKey = (endDestination || 'santiago').toLowerCase().trim();
  
  let totalRouteDistance = ROUTE_DISTANCES[startKey] || 62;
  
  if (endKey.includes('finisterre')) {
    totalRouteDistance += 56;
  }
  
  const finalTarget = 11.2; 
  const startBaseline = physicalBaseline || 1.2;
  
  const schedule: TrainingDay[] = [];
  
  for (let i = 0; i < diffDays; i++) {
    const currentDayDate = new Date();
    currentDayDate.setDate(today.getDate() + i);
    
    let target = startBaseline + ((finalTarget - startBaseline) * (i / diffDays));
    
    if ((i + 1) % 4 === 0) {
      target = target * 0.5;
    }
    
    schedule.push({
      day: i + 1,
      date: currentDayDate.toISOString().split('T')[0],
      targetDistance: parseFloat(target.toFixed(1)),
      completed: false
    });
  }
  
  // Save to localStorage instead of Firestore
  savePlans([{
    startDate: today.toISOString().split('T')[0],
    endDate: departureDate,
    totalDistance: totalRouteDistance,
    schedule,
    updatedAt: new Date().toISOString()
  }]);
}
