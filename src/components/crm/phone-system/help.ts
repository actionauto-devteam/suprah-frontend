export type HelpTopic = { title: string; intro: string; steps: string[]; goodToKnow: string[] };
export type PhoneSystemTab = "numbers" | "menu" | "my-calls" | "recordings";

export const PHONE_SYSTEM_HELP: Record<PhoneSystemTab, HelpTopic> = {
  numbers: {
    title: "Numbers",
    intro: "These are your store's phone numbers. When a customer calls or texts one of them, it shows up in Suprah.",
    steps: [
      "Press Add phone number.",
      "Type the number and give it a name, like Lehi Sales.",
      "Pick what the number is for: the main number, a store location, or a department like Service.",
      "Pick who answers it: one team, or everyone.",
      "Press Save. Wait until you see Ready for calls and Ready for texts.",
    ],
    goodToKnow: [
      "When you reply to a customer, Suprah uses the same number the customer called or texted.",
      "If nobody answers, the customer gets a text back and the team gets a Missed call message.",
      "A number that is not ready is never used.",
    ],
  },
  menu: {
    title: "Phone Menu",
    intro: "This is what customers hear when they call, like: Press 1 for Lehi, press 2 for Orem.",
    steps: [
      "Press New configuration.",
      "Pick the number that plays the menu. Most of the time this is your main number.",
      "Write what the caller hears.",
      "Add one option for each key. Give it a name and pick where it goes: a team, a store, a language, or one of your numbers.",
      "Pick the Reception team. They get the call when nobody else answers.",
      "Turn the menu on and save. Then call the number and try every key.",
    ],
    goodToKnow: [
      "If the caller presses nothing or a wrong key, they hear the menu again.",
      "If nobody answers, Reception gets the call. You can also let it ring everyone.",
      "If still nobody answers, the caller gets a text back.",
    ],
  },
  "my-calls": {
    title: "My Calls",
    intro: "Customer calls always pop up in Suprah. Here you can make them ring your own cell phone too.",
    steps: [
      "Type your cell phone number.",
      "Check Also ring my phone for customer calls, then press Save.",
      "Press Confirm with a test call. Your phone rings. Answer it and press 1.",
      "That's it. Customer calls now ring your phone and Suprah at the same time.",
    ],
    goodToKnow: [
      "When a customer call rings your phone, you hear who is calling. Press 1 to take it.",
      "The first person who answers gets the call. Everyone else stops ringing.",
      "Only you can see and change this.",
    ],
  },
  recordings: {
    title: "Recordings",
    intro: "Here are the calls your team recorded, so you can listen to them later.",
    steps: [
      "During a call, press Record on the call bar. The customer and you hear: This call is now being recorded.",
      "You can press Pause and Resume. The recording stops by itself when the call ends.",
      "The recording shows up here with the customer, the rep, the date and how long the call was.",
      "Press Listen to play it. Press Mark reviewed when you are done checking it.",
    ],
    goodToKnow: [
      "Every rep can record their own calls.",
      "Only the people in Who can access can listen, download, share or delete recordings.",
      "Recordings are deleted by themselves after the number of months set in Settings.",
    ],
  },
};
