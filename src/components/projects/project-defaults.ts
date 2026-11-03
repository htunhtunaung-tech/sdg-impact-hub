// Shared by server pages and the client form (must not live in a "use client" module).
export interface ProjectFormValues {
  title: string;
  summary: string;
  description: string;
  objectives: string[];
  tasks: string[];
  goals: number[];
  primaryGoal: number | null;
  status: string;
  imageUrl: string | null;
  organizationId: string;
  budget: string;
  fundingGoal: string;
  currency: string;
  isOnline: boolean;
  locationName: string;
  city: string;
  country: string;
  latitude: number | null;
  longitude: number | null;
  startDate: string;
  endDate: string;
  scheduleText: string;
  commitment: string;
  skillsNeeded: string[];
  volunteersNeeded: string;
  impactTargets: { metricId: string; targetValue: string }[];
}

export const emptyProject: ProjectFormValues = {
  title: "", summary: "", description: "", objectives: [], tasks: [], goals: [], primaryGoal: null, status: "RECRUITING", imageUrl: null,
  organizationId: "", budget: "", fundingGoal: "", currency: "USD", isOnline: false, locationName: "", city: "", country: "",
  latitude: null, longitude: null, startDate: "", endDate: "", scheduleText: "", commitment: "", skillsNeeded: [], volunteersNeeded: "10", impactTargets: [],
};

