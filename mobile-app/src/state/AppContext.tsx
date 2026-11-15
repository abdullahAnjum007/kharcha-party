import { PropsWithChildren, createContext, useContext, useMemo, useState } from 'react';

export type SetupMode = 'create' | 'join';
export type DemoRole = 'leader' | 'traveller';

type AppState = {
  setupMode: SetupMode;
  setSetupMode: (mode: SetupMode) => void;
  groupName: string;
  setGroupName: (value: string) => void;
  groupCode: string;
  setGroupCode: (value: string) => void;
  inviteCode: string;
  setInviteCode: (value: string) => void;
  members: string[];
  memberCodes: string[];
  setMemberCount: (count: number) => void;
  updateMember: (index: number, name: string) => void;
  leader: string;
  setLeader: (name: string) => void;
  individualBudget: string;
  setIndividualBudget: (value: string) => void;
  budgetDecided: boolean | null;
  setBudgetDecided: (value: boolean) => void;
  demoRole: DemoRole;
  setDemoRole: (role: DemoRole) => void;
};

const AppContext = createContext<AppState | undefined>(undefined);
const defaultNames = ['Ali', 'You', 'Sara', 'Hamza', 'Zoya', 'Daniyal', 'Areeba', 'Bilal'];

export function AppProvider({ children }: PropsWithChildren) {
  const [setupMode, setSetupMode] = useState<SetupMode>('create');
  const [groupName, setGroupName] = useState('Hunza Scene 2026');
  const [groupCode, setGroupCode] = useState('KHP-786');
  const [inviteCode, setInviteCode] = useState('0427');
  const [members, setMembers] = useState(defaultNames.slice(0, 4));
  const [memberCodes, setMemberCodes] = useState(['1842', '0427', '6391', '7754']);
  const [leader, setLeader] = useState('Ali');
  const [individualBudget, setIndividualBudget] = useState('25000');
  const [budgetDecided, setBudgetDecided] = useState<boolean | null>(true);
  const [demoRole, setDemoRole] = useState<DemoRole>('leader');

  const setMemberCount = (count: number) => {
    const safeCount = Math.min(8, Math.max(2, count || 2));
    setMembers((current) =>
      Array.from({ length: safeCount }, (_, index) => current[index] ?? defaultNames[index] ?? `Dost ${index + 1}`),
    );
    setMemberCodes((current) =>
      Array.from({ length: safeCount }, (_, index) => current[index] ?? String(1000 + ((index + 1) * 1789) % 9000).padStart(4, '0')),
    );
  };

  const updateMember = (index: number, name: string) => {
    setMembers((current) => current.map((member, memberIndex) => (memberIndex === index ? name : member)));
  };

  const value = useMemo(
    () => ({
      setupMode,
      setSetupMode,
      groupName,
      setGroupName,
      groupCode,
      setGroupCode,
      inviteCode,
      setInviteCode,
      members,
      memberCodes,
      setMemberCount,
      updateMember,
      leader,
      setLeader,
      individualBudget,
      setIndividualBudget,
      budgetDecided,
      setBudgetDecided,
      demoRole,
      setDemoRole,
    }),
    [setupMode, groupName, groupCode, inviteCode, members, memberCodes, leader, individualBudget, budgetDecided, demoRole],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useAppState() {
  const context = useContext(AppContext);
  if (!context) throw new Error('useAppState must be used inside AppProvider');
  return context;
}

// Later: replace this local provider with backend persistence and real-time group sync.
