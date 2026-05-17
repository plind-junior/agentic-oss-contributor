import { useSyncExternalStore } from "react";
import {
  getCredentials,
  subscribeToCredentials,
  type Credentials,
} from "../credentials";

export function useCredentials(): Credentials | null {
  return useSyncExternalStore(subscribeToCredentials, getCredentials, getCredentials);
}
