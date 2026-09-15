import {
  collection,
  doc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  writeBatch,
  getDocFromServer,
} from 'firebase/firestore';
import { db } from './firebaseAuth';
import { handleFirestoreError, OperationType } from './firestoreError';
import {
  BillboardLocation,
  CRMClient,
  SensorThresholdConfig,
  AlertNotification,
  ProposalRecord,
} from '../types';
import {
  INITIAL_BILLBOARDS,
  INITIAL_CLIENTS,
  INITIAL_THRESHOLDS,
  INITIAL_ALERTS,
} from '../data/initialData';

export const BILLBOARDS_COLLECTION = 'billboards';
export const CLIENTS_COLLECTION = 'crm_clients';
export const ALERTS_COLLECTION = 'sensor_alerts';
export const THRESHOLDS_COLLECTION = 'threshold_config';
export const PROPOSALS_COLLECTION = 'proposals';

/**
 * Connection test on startup using getDocFromServer to verify Firestore connectivity
 */
export async function testFirestoreConnection(): Promise<boolean> {
  try {
    const testDocRef = doc(db, 'test', 'connection');
    await getDocFromServer(testDocRef);
    return true;
  } catch (error: any) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error('Please check your Firebase configuration.');
      return false;
    }
    // If not-found or permission check passed, connection reached the server
    if (error.code === 'not-found' || error.message?.includes('not found')) {
      return true;
    }
    console.warn('Firestore connection check notice:', error.message || error);
    return true;
  }
}

/**
 * Seed initial Firestore collections if empty
 */
export async function seedInitialFirestoreDataIfEmpty(): Promise<void> {
  try {
    const snapshot = await getDocs(collection(db, BILLBOARDS_COLLECTION));
    if (!snapshot.empty) {
      return; // Already populated
    }

    console.info('Seeding initial billboard, client, alert and threshold data to Firestore...');
    const batch = writeBatch(db);

    // Billboards
    INITIAL_BILLBOARDS.forEach((b) => {
      const ref = doc(db, BILLBOARDS_COLLECTION, b.id);
      batch.set(ref, b);
    });

    // CRM Clients
    INITIAL_CLIENTS.forEach((c) => {
      const ref = doc(db, CLIENTS_COLLECTION, c.id);
      batch.set(ref, c);
    });

    // Alerts
    INITIAL_ALERTS.forEach((a) => {
      const ref = doc(db, ALERTS_COLLECTION, a.id);
      batch.set(ref, a);
    });

    // Thresholds
    const thresholdRef = doc(db, THRESHOLDS_COLLECTION, 'active');
    batch.set(thresholdRef, INITIAL_THRESHOLDS);

    await batch.commit();
    console.info('Firestore seeded successfully.');
  } catch (error) {
    console.warn('Initial seeding bypassed or failed:', error);
    // Non-fatal, app falls back to local memory if offline/restricted
  }
}

/**
 * Real-time subscription to Billboards collection
 */
export function subscribeToBillboards(
  onData: (billboards: BillboardLocation[]) => void,
  onError?: (err: any) => void
) {
  const colRef = collection(db, BILLBOARDS_COLLECTION);
  return onSnapshot(
    colRef,
    (snapshot) => {
      if (snapshot.empty) {
        onData([]);
        return;
      }
      const list = snapshot.docs.map((d) => d.data() as BillboardLocation);
      onData(list);
    },
    (error) => {
      console.error('Error listening to billboards in Firestore:', error);
      if (onError) onError(error);
    }
  );
}

/**
 * Save or update a single billboard in Firestore
 */
export async function saveBillboardToFirestore(billboard: BillboardLocation): Promise<void> {
  const path = `${BILLBOARDS_COLLECTION}/${billboard.id}`;
  try {
    const ref = doc(db, BILLBOARDS_COLLECTION, billboard.id);
    await setDoc(ref, billboard, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

/**
 * Batch update multiple billboards (e.g. from CSV or Google Sheets sync)
 */
export async function batchSaveBillboardsToFirestore(billboards: BillboardLocation[]): Promise<void> {
  try {
    const batch = writeBatch(db);
    billboards.forEach((b) => {
      const ref = doc(db, BILLBOARDS_COLLECTION, b.id);
      batch.set(ref, b, { merge: true });
    });
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, BILLBOARDS_COLLECTION);
  }
}

/**
 * Real-time subscription to Sensor Alerts collection
 */
export function subscribeToAlerts(
  onData: (alerts: AlertNotification[]) => void,
  onError?: (err: any) => void
) {
  const colRef = collection(db, ALERTS_COLLECTION);
  return onSnapshot(
    colRef,
    (snapshot) => {
      const list = snapshot.docs
        .map((d) => d.data() as AlertNotification)
        // Filter out any alert titled 'Pencahayaan Billboard' or containing 'Pencahayaan'
        .filter((a) => !a.title?.toLowerCase().includes('pencahayaan'));
      // Sort newest first
      list.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      onData(list);
    },
    (error) => {
      console.error('Error listening to alerts in Firestore:', error);
      if (onError) onError(error);
      handleFirestoreError(error, OperationType.GET, ALERTS_COLLECTION);
    }
  );
}

/**
 * Save new alert to Firestore
 */
export async function saveAlertToFirestore(alert: AlertNotification): Promise<void> {
  // Prevent saving any alert with title containing 'Pencahayaan'
  if (alert.title?.toLowerCase().includes('pencahayaan')) {
    return;
  }
  const path = `${ALERTS_COLLECTION}/${alert.id}`;
  try {
    const ref = doc(db, ALERTS_COLLECTION, alert.id);
    await setDoc(ref, alert, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

/**
 * Delete an alert from Firestore
 */
export async function deleteAlertFromFirestore(alertId: string): Promise<void> {
  const path = `${ALERTS_COLLECTION}/${alertId}`;
  try {
    const ref = doc(db, ALERTS_COLLECTION, alertId);
    await deleteDoc(ref);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

/**
 * Clean up any lingering alerts with title containing 'Pencahayaan' from Firestore
 */
export async function cleanupPencahayaanAlertsFromFirestore(): Promise<void> {
  try {
    const snapshot = await getDocs(collection(db, ALERTS_COLLECTION));
    snapshot.docs.forEach(async (d) => {
      const data = d.data() as AlertNotification;
      if (data.title?.toLowerCase().includes('pencahayaan') || d.id === 'alt-003') {
        try {
          await deleteDoc(d.ref);
        } catch {
          // Ignore
        }
      }
    });
  } catch {
    // Ignore offline or initial check issues
  }
}

/**
 * Mark an alert as acknowledged in Firestore
 */
export async function acknowledgeAlertInFirestore(alertId: string): Promise<void> {
  const path = `${ALERTS_COLLECTION}/${alertId}`;
  try {
    const ref = doc(db, ALERTS_COLLECTION, alertId);
    await updateDoc(ref, { acknowledged: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

/**
 * Real-time subscription to CRM Clients
 */
export function subscribeToClients(
  onData: (clients: CRMClient[]) => void,
  onError?: (err: any) => void
) {
  const colRef = collection(db, CLIENTS_COLLECTION);
  return onSnapshot(
    colRef,
    (snapshot) => {
      const list = snapshot.docs.map((d) => d.data() as CRMClient);
      onData(list);
    },
    (error) => {
      console.error('Error listening to clients in Firestore:', error);
      if (onError) onError(error);
      handleFirestoreError(error, OperationType.GET, CLIENTS_COLLECTION);
    }
  );
}

/**
 * Update CRM client
 */
export async function updateClientInFirestore(client: CRMClient): Promise<void> {
  const path = `${CLIENTS_COLLECTION}/${client.id}`;
  try {
    const ref = doc(db, CLIENTS_COLLECTION, client.id);
    await setDoc(ref, client, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

/**
 * Real-time subscription to Threshold Config
 */
export function subscribeToThresholds(
  onData: (config: SensorThresholdConfig) => void,
  onError?: (err: any) => void
) {
  const docRef = doc(db, THRESHOLDS_COLLECTION, 'active');
  const path = `${THRESHOLDS_COLLECTION}/active`;
  return onSnapshot(
    docRef,
    (snapshot) => {
      if (snapshot.exists()) {
        onData(snapshot.data() as SensorThresholdConfig);
      }
    },
    (error) => {
      console.error('Error listening to thresholds in Firestore:', error);
      if (onError) onError(error);
      handleFirestoreError(error, OperationType.GET, path);
    }
  );
}

/**
 * Save threshold config
 */
export async function saveThresholdsToFirestore(config: SensorThresholdConfig): Promise<void> {
  const path = `${THRESHOLDS_COLLECTION}/active`;
  try {
    const ref = doc(db, THRESHOLDS_COLLECTION, 'active');
    await setDoc(ref, config);
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

/**
 * Real-time subscription to proposals in Firestore
 */
export function subscribeToProposals(
  onData: (proposals: ProposalRecord[]) => void,
  onError?: (err: any) => void
) {
  const colRef = collection(db, PROPOSALS_COLLECTION);
  return onSnapshot(
    colRef,
    (snapshot) => {
      const list = snapshot.docs.map((d) => d.data() as ProposalRecord);
      list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      onData(list);
    },
    (error) => {
      console.error('Error listening to proposals in Firestore:', error);
      if (onError) onError(error);
      handleFirestoreError(error, OperationType.GET, PROPOSALS_COLLECTION);
    }
  );
}

/**
 * Save or update a proposal in Firestore
 */
export async function saveProposalToFirestore(proposal: ProposalRecord): Promise<void> {
  const path = `${PROPOSALS_COLLECTION}/${proposal.id}`;
  try {
    const ref = doc(db, PROPOSALS_COLLECTION, proposal.id);
    await setDoc(ref, proposal, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

/**
 * Delete proposal from Firestore
 */
export async function deleteProposalFromFirestore(proposalId: string): Promise<void> {
  const path = `${PROPOSALS_COLLECTION}/${proposalId}`;
  try {
    const ref = doc(db, PROPOSALS_COLLECTION, proposalId);
    await deleteDoc(ref);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}
