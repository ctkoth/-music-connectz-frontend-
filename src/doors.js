import { goToSpot } from "./goto.js";
import { handOff } from "./handoff.js";

/** Open a server-listed door (`{tab, target, carry}`): with a payload it is a
 *  handoff that arrives holding the work, without one it lands on the control. */
export function openDoor(door) {
  return door.carry && Object.keys(door.carry).length
    ? handOff(door.tab, door.target, door.carry)
    : goToSpot(door.tab, door.target);
}
