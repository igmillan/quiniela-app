import {
  doc,
  setDoc,
  serverTimestamp,
  collection,
  query,
  orderBy,
  limit,
  onSnapshot,
} from "firebase/firestore";
import { db } from "./firebase";

export async function saveJourneySummary(journeyDate, summary) {
  await setDoc(
    doc(db, "journadas", journeyDate),
    {
      ...summary,
      generatedAt: serverTimestamp(),
    },
    { merge: true }
  );
}

export function subscribeLatestJourneySummary(callback) {
  const q = query(
    collection(db, "journadas"),
    orderBy("date", "desc"),
    limit(1)
  );

  return onSnapshot(q, (snapshot) => {
    if (snapshot.empty) {
      callback(null);
      return;
    }

    const docSnap = snapshot.docs[0];
    callback({
      id: docSnap.id,
      ...docSnap.data(),
    });
  });
}