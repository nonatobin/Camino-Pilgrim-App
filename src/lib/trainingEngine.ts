import { db } from '../firebase';
import { collection, addDoc, query, where, getDocs, deleteDoc, doc, serverTimestamp } from 'firebase/firestore';

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
  
  // Estimate total route distance (in miles)
  const startKey = startLocation.toLowerCase().trim();
  const endKey = endDestination?.toLowerCase().trim() || 'santiago';
  
  let totalRouteDistance = ROUTE_DISTANCES[startKey] || 62; // Default to ~100km in miles
  
  // If destination is Finisterre, add ~56 miles (90km) from Santiago
  if (endKey.includes('finisterre')) {
    totalRouteDistance += 56;
  }
  
  // We want to reach a point where they can walk ~11-12 miles comfortably by departure
  const finalTarget = 11.2; 
  const startBaseline = physicalBaseline || 1.2;
  
  const schedule: TrainingDay[] = [];
  
  for (let i = 0; i < diffDays; i++) {
    const currentDayDate = new Date();
    currentDayDate.setDate(today.getDate() + i);
    
    // Linear progression with some rest days (every 4th day is a light day)
    let target = startBaseline + ((finalTarget - startBaseline) * (i / diffDays));
    
    if ((i + 1) % 4 === 0) {
      target = target * 0.5; // Rest/Light day
    }
    
    schedule.push({
      day: i + 1,
      date: currentDayDate.toISOString().split('T')[0],
      targetDistance: parseFloat(target.toFixed(1)),
      completed: false
    });
  }
  
  // Clear old plans
  const plansRef = collection(db, 'users', user.uid, 'plans');
  const q = query(plansRef);
  const oldPlans = await getDocs(q);
  for (const planDoc of oldPlans.docs) {
    await deleteDoc(doc(db, 'users', user.uid, 'plans', planDoc.id));
  }
  
  // Save new plan
  await addDoc(plansRef, {
    uid: user.uid,
    startDate: today.toISOString().split('T')[0],
    endDate: departureDate,
    totalDistance: totalRouteDistance,
    schedule,
    updatedAt: serverTimestamp()
  });
}
