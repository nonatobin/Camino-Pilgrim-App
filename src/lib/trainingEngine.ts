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
  today.setHours(0, 0, 0, 0); // Normalize to start of today
  
  const departure = new Date(departureDate);
  departure.setHours(0, 0, 0, 0); // Normalize to start of departure day
  
  // Calculate days remaining (departure - today)
  const diffTime = departure.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  // Guard against departure in past or today
  if (diffDays <= 0) {
    console.warn(
      'Warning: Departure date is today or in the past. Generating 30-day default plan.',
      { departureDate, diffDays }
    );
    // Generate a default 30-day plan instead
    const defaultDepartureDate = new Date(today);
    defaultDepartureDate.setDate(today.getDate() + 30);
    return generateTrainingPlan(user, {
      ...profile,
      departureDate: defaultDepartureDate.toISOString().split('T')[0],
    });
  }
  
  const startKey = (startLocation || 'baiona').toLowerCase().trim();
  const endKey = (endDestination || 'santiago').toLowerCase().trim();
  
  let totalRouteDistance = ROUTE_DISTANCES[startKey] || 62;
  
  if (endKey.includes('finisterre')) {
    totalRouteDistance += 56;
  }
  
  const finalTarget = 11.2; 
  const startBaseline = Math.max(0.5, physicalBaseline || 1.2); // Ensure baseline is at least 0.5
  
  const schedule: TrainingDay[] = [];
  
  for (let i = 0; i < diffDays; i++) {
    const currentDayDate = new Date(today);
    currentDayDate.setDate(today.getDate() + i);
    
    // Progress fraction: 0 on day 0, approaching 1.0 by last day
    // Use (i + 1) to ensure progression to target by end
    const progress = (i + 1) / diffDays;
    let target = startBaseline + ((finalTarget - startBaseline) * progress);
    
    // Every 4th day is a rest day (50% of normal)
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
