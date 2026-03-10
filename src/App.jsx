import { useState, useEffect } from "react";
import { initializeApp } from "firebase/app";
import { getFirestore, doc, setDoc, onSnapshot, updateDoc } from "firebase/firestore";

// FIREBASE
const firebaseConfig = {
  apiKey: "AIzaSyDL2FV0gfT5b58f5mXmAPJMqSbwKde0IV0",
  authDomain: "mundial2026-2026.firebaseapp.com",
  projectId: "mundial2026-2026",
  storageBucket: "mundial2026-2026.firebasestorage.app",
  messagingSenderId: "76029862427",
  appId: "1:76029862427:web:23f21566a32e1c40610ebe"
};
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const PARTICIPANTS_DOC = doc(db, "tournament", "participants");
const MATCHES_DOC = doc(db, "tournament", "matches");
const SETTINGS_DOC = doc(db, "tournament", "settings");
const INVOICES_DOC = doc(db, "tournament", "invoices");

// GROUPS
const GROUPS = {
  A: ["México","Corea del Sur","Sudáfrica","Dinamarca*"],
  B: ["Canadá","Suiza","Catar","Italia*"],
  C: ["Brasil","Haití","Marruecos","Escocia"],
  D: ["Estados Unidos","Australia","Paraguay","Turquía*"],
  E: ["Alemania","Costa de Marfil","Ecuador","Curazao"],
  F: ["Países Bajos","Japón","Túnez","Ucrania*"],
  G: ["Bélgica","Irán","Egipto","Nueva Zelanda"],
  H: ["España","Arabia Saudí","Uruguay","Cabo Verde"],
  I: ["Francia","Noruega","Senegal","Irak*"],
  J: ["Argentina","Austria","Argelia","Jordania"],
  K: ["Portugal","Uzbekistán","Colombia","Jamaica*"],
  L: ["Inglaterra","Croacia","Ghana","Panamá"],
}

const GROUP_COLORS = {
  A:"#e63946", B:"#2a9d8f", C:"#e76f51", D:"#457b9d",
  E:"#6a4c93", F:"#f4a261", G:"#2d6a4f", H:"#e9c46a",
  I:"#1d3557", J:"#c77dff", K:"#06d6a0", L:"#ef476f",
};

const LOCK_DATES = {
  groups:  new Date("2026-06-11T00:00:00"),
  round32: new Date("2026-06-28T00:00:00"),
  round16: new Date("2026-07-04T00:00:00"),
  quarters:new Date("2026-07-09T00:00:00"),
  semis:   new Date("2026-07-14T00:00:00"),
  third:   new Date("2026-07-18T00:00:00"),
  final:   new Date("2026-07-19T00:00:00"),
};

// INVOICE POINTS SCALE (CAD)
function calcInvoicePoints(amount) {
  const a = parseFloat(amount);
  if (isNaN(a) || a < 10) return 0;
  if (a <= 50)  return 1;
  if (a <= 100) return 3;
  if (a <= 150) return 6;
  if (a <= 200) return 9;
  return 12;
}

function isPhaseLocked(phase, adminUnlocked = {}) {
  if (adminUnlocked[phase+"_forced"]) return true;
  if (adminUnlocked[phase]) return false;
  const lockDate = LOCK_DATES[phase];
  if (!lockDate) return false;
  return new Date() >= lockDate;
}

function isMatchLocked(match, adminUnlocked = {}) {
  if (!match) return false;
  if (match.phase !== "groups") return isPhaseLocked(match.phase, adminUnlocked);
  // Per-match lock: 1 hour before kickoff
  if (adminUnlocked["groups"]) return false;         // admin unlocked whole phase
  if (adminUnlocked["groups_forced"]) return true;   // admin force-locked whole phase
  if (!match.lockTime) return isPhaseLocked("groups", adminUnlocked);
  return new Date() >= new Date(match.lockTime);
}

function generateGroupMatches() {
  // Official FIFA 2026 schedule - all 72 group matches
  const matches = [
    // GRUPO A
    {id:1,  phase:"groups",group:"A",date:"11 Jun",home:"México",            away:"Sudáfrica",         realHome:null,realAway:null,lockTime:"2026-06-11T15:00:00"},
    {id:2,  phase:"groups",group:"A",date:"11 Jun",home:"Corea del Sur",     away:"Dinamarca*",        realHome:null,realAway:null,lockTime:"2026-06-11T18:00:00"},
    {id:3,  phase:"groups",group:"A",date:"18 Jun",home:"Dinamarca*",        away:"Sudáfrica",         realHome:null,realAway:null,lockTime:"2026-06-18T15:00:00"},
    {id:4,  phase:"groups",group:"A",date:"18 Jun",home:"México",            away:"Corea del Sur",     realHome:null,realAway:null,lockTime:"2026-06-18T18:00:00"},
    {id:5,  phase:"groups",group:"A",date:"24 Jun",home:"Dinamarca*",        away:"México",            realHome:null,realAway:null,lockTime:"2026-06-24T15:00:00"},
    {id:6,  phase:"groups",group:"A",date:"24 Jun",home:"Sudáfrica",         away:"Corea del Sur",     realHome:null,realAway:null,lockTime:"2026-06-24T15:00:00"},
    // GRUPO B
    {id:7,  phase:"groups",group:"B",date:"12 Jun",home:"Canadá",            away:"Italia*",           realHome:null,realAway:null,lockTime:"2026-06-12T15:00:00"},
    {id:8,  phase:"groups",group:"B",date:"13 Jun",home:"Catar",             away:"Suiza",             realHome:null,realAway:null,lockTime:"2026-06-13T15:00:00"},
    {id:9,  phase:"groups",group:"B",date:"18 Jun",home:"Suiza",             away:"Italia*",           realHome:null,realAway:null,lockTime:"2026-06-18T12:00:00"},
    {id:10, phase:"groups",group:"B",date:"18 Jun",home:"Canadá",            away:"Catar",             realHome:null,realAway:null,lockTime:"2026-06-18T21:00:00"},
    {id:11, phase:"groups",group:"B",date:"24 Jun",home:"Suiza",             away:"Canadá",            realHome:null,realAway:null,lockTime:"2026-06-24T18:00:00"},
    {id:12, phase:"groups",group:"B",date:"24 Jun",home:"Italia*",           away:"Catar",             realHome:null,realAway:null,lockTime:"2026-06-24T18:00:00"},
    // GRUPO C
    {id:13, phase:"groups",group:"C",date:"13 Jun",home:"Brasil",            away:"Marruecos",         realHome:null,realAway:null,lockTime:"2026-06-13T18:00:00"},
    {id:14, phase:"groups",group:"C",date:"13 Jun",home:"Haití",             away:"Escocia",           realHome:null,realAway:null,lockTime:"2026-06-13T21:00:00"},
    {id:15, phase:"groups",group:"C",date:"19 Jun",home:"Escocia",           away:"Marruecos",         realHome:null,realAway:null,lockTime:"2026-06-19T15:00:00"},
    {id:16, phase:"groups",group:"C",date:"19 Jun",home:"Brasil",            away:"Haití",             realHome:null,realAway:null,lockTime:"2026-06-19T18:00:00"},
    {id:17, phase:"groups",group:"C",date:"24 Jun",home:"Brasil",            away:"Escocia",           realHome:null,realAway:null,lockTime:"2026-06-25T15:00:00"},
    {id:18, phase:"groups",group:"C",date:"24 Jun",home:"Marruecos",         away:"Haití",             realHome:null,realAway:null,lockTime:"2026-06-25T15:00:00"},
    // GRUPO D
    {id:19, phase:"groups",group:"D",date:"12 Jun",home:"Estados Unidos",    away:"Paraguay",          realHome:null,realAway:null,lockTime:"2026-06-12T18:00:00"},
    {id:20, phase:"groups",group:"D",date:"12 Jun",home:"Australia",         away:"Turquía*",          realHome:null,realAway:null,lockTime:"2026-06-12T21:00:00"},
    {id:21, phase:"groups",group:"D",date:"18 Jun",home:"Turquía*",          away:"Paraguay",          realHome:null,realAway:null,lockTime:"2026-06-18T18:00:00"},
    {id:22, phase:"groups",group:"D",date:"19 Jun",home:"Estados Unidos",    away:"Australia",         realHome:null,realAway:null,lockTime:"2026-06-19T21:00:00"},
    {id:23, phase:"groups",group:"D",date:"25 Jun",home:"Turquía*",          away:"Estados Unidos",    realHome:null,realAway:null,lockTime:"2026-06-25T18:00:00"},
    {id:24, phase:"groups",group:"D",date:"25 Jun",home:"Paraguay",          away:"Australia",         realHome:null,realAway:null,lockTime:"2026-06-25T18:00:00"},
    // GRUPO E
    {id:25, phase:"groups",group:"E",date:"14 Jun",home:"Alemania",          away:"Curazao",           realHome:null,realAway:null,lockTime:"2026-06-14T15:00:00"},
    {id:26, phase:"groups",group:"E",date:"14 Jun",home:"Costa de Marfil",   away:"Ecuador",           realHome:null,realAway:null,lockTime:"2026-06-14T18:00:00"},
    {id:27, phase:"groups",group:"E",date:"20 Jun",home:"Alemania",          away:"Costa de Marfil",   realHome:null,realAway:null,lockTime:"2026-06-20T15:00:00"},
    {id:28, phase:"groups",group:"E",date:"20 Jun",home:"Ecuador",           away:"Curazao",           realHome:null,realAway:null,lockTime:"2026-06-20T18:00:00"},
    {id:29, phase:"groups",group:"E",date:"25 Jun",home:"Curazao",           away:"Costa de Marfil",   realHome:null,realAway:null,lockTime:"2026-06-26T15:00:00"},
    {id:30, phase:"groups",group:"E",date:"25 Jun",home:"Ecuador",           away:"Alemania",          realHome:null,realAway:null,lockTime:"2026-06-26T15:00:00"},
    // GRUPO F
    {id:31, phase:"groups",group:"F",date:"14 Jun",home:"Países Bajos",      away:"Japón",             realHome:null,realAway:null,lockTime:"2026-06-15T15:00:00"},
    {id:32, phase:"groups",group:"F",date:"14 Jun",home:"Ucrania*",          away:"Túnez",             realHome:null,realAway:null,lockTime:"2026-06-15T18:00:00"},
    {id:33, phase:"groups",group:"F",date:"19 Jun",home:"Túnez",             away:"Japón",             realHome:null,realAway:null,lockTime:"2026-06-20T21:00:00"},
    {id:34, phase:"groups",group:"F",date:"20 Jun",home:"Países Bajos",      away:"Ucrania*",          realHome:null,realAway:null,lockTime:"2026-06-21T15:00:00"},
    {id:35, phase:"groups",group:"F",date:"25 Jun",home:"Japón",             away:"Ucrania*",          realHome:null,realAway:null,lockTime:"2026-06-26T18:00:00"},
    {id:36, phase:"groups",group:"F",date:"25 Jun",home:"Túnez",             away:"Países Bajos",      realHome:null,realAway:null,lockTime:"2026-06-26T18:00:00"},
    // GRUPO G
    {id:37, phase:"groups",group:"G",date:"15 Jun",home:"Bélgica",           away:"Egipto",            realHome:null,realAway:null,lockTime:"2026-06-15T21:00:00"},
    {id:38, phase:"groups",group:"G",date:"15 Jun",home:"Irán",              away:"Nueva Zelanda",     realHome:null,realAway:null,lockTime:"2026-06-16T15:00:00"},
    {id:39, phase:"groups",group:"G",date:"21 Jun",home:"Bélgica",           away:"Irán",              realHome:null,realAway:null,lockTime:"2026-06-21T18:00:00"},
    {id:40, phase:"groups",group:"G",date:"21 Jun",home:"Nueva Zelanda",     away:"Egipto",            realHome:null,realAway:null,lockTime:"2026-06-21T21:00:00"},
    {id:41, phase:"groups",group:"G",date:"26 Jun",home:"Egipto",            away:"Irán",              realHome:null,realAway:null,lockTime:"2026-06-26T21:00:00"},
    {id:42, phase:"groups",group:"G",date:"26 Jun",home:"Nueva Zelanda",     away:"Bélgica",           realHome:null,realAway:null,lockTime:"2026-06-26T21:00:00"},
    // GRUPO H
    {id:43, phase:"groups",group:"H",date:"15 Jun",home:"España",            away:"Cabo Verde",        realHome:null,realAway:null,lockTime:"2026-06-16T18:00:00"},
    {id:44, phase:"groups",group:"H",date:"15 Jun",home:"Arabia Saudí",      away:"Uruguay",           realHome:null,realAway:null,lockTime:"2026-06-16T21:00:00"},
    {id:45, phase:"groups",group:"H",date:"21 Jun",home:"España",            away:"Arabia Saudí",      realHome:null,realAway:null,lockTime:"2026-06-22T15:00:00"},
    {id:46, phase:"groups",group:"H",date:"21 Jun",home:"Uruguay",           away:"Cabo Verde",        realHome:null,realAway:null,lockTime:"2026-06-22T18:00:00"},
    {id:47, phase:"groups",group:"H",date:"26 Jun",home:"Cabo Verde",        away:"Arabia Saudí",      realHome:null,realAway:null,lockTime:"2026-06-27T15:00:00"},
    {id:48, phase:"groups",group:"H",date:"26 Jun",home:"Uruguay",           away:"España",            realHome:null,realAway:null,lockTime:"2026-06-27T15:00:00"},
    // GRUPO I
    {id:49, phase:"groups",group:"I",date:"16 Jun",home:"Francia",           away:"Senegal",           realHome:null,realAway:null,lockTime:"2026-06-17T15:00:00"},
    {id:50, phase:"groups",group:"I",date:"16 Jun",home:"Irak*",             away:"Noruega",           realHome:null,realAway:null,lockTime:"2026-06-17T18:00:00"},
    {id:51, phase:"groups",group:"I",date:"22 Jun",home:"Francia",           away:"Irak*",             realHome:null,realAway:null,lockTime:"2026-06-22T21:00:00"},
    {id:52, phase:"groups",group:"I",date:"22 Jun",home:"Noruega",           away:"Senegal",           realHome:null,realAway:null,lockTime:"2026-06-23T15:00:00"},
    {id:53, phase:"groups",group:"I",date:"26 Jun",home:"Noruega",           away:"Francia",           realHome:null,realAway:null,lockTime:"2026-06-27T18:00:00"},
    {id:54, phase:"groups",group:"I",date:"26 Jun",home:"Senegal",           away:"Irak*",             realHome:null,realAway:null,lockTime:"2026-06-27T18:00:00"},
    // GRUPO J
    {id:55, phase:"groups",group:"J",date:"15 Jun",home:"Austria",           away:"Jordania",          realHome:null,realAway:null,lockTime:"2026-06-17T21:00:00"},
    {id:56, phase:"groups",group:"J",date:"16 Jun",home:"Argentina",         away:"Argelia",           realHome:null,realAway:null,lockTime:"2026-06-18T15:00:00"},
    {id:57, phase:"groups",group:"J",date:"22 Jun",home:"Argentina",         away:"Austria",           realHome:null,realAway:null,lockTime:"2026-06-23T18:00:00"},
    {id:58, phase:"groups",group:"J",date:"22 Jun",home:"Jordania",          away:"Argelia",           realHome:null,realAway:null,lockTime:"2026-06-23T21:00:00"},
    {id:59, phase:"groups",group:"J",date:"27 Jun",home:"Argelia",           away:"Austria",           realHome:null,realAway:null,lockTime:"2026-06-27T21:00:00"},
    {id:60, phase:"groups",group:"J",date:"27 Jun",home:"Jordania",          away:"Argentina",         realHome:null,realAway:null,lockTime:"2026-06-27T21:00:00"},
    // GRUPO K
    {id:61, phase:"groups",group:"K",date:"17 Jun",home:"Portugal",          away:"Jamaica*",          realHome:null,realAway:null,lockTime:"2026-06-17T12:00:00"},
    {id:62, phase:"groups",group:"K",date:"17 Jun",home:"Uzbekistán",        away:"Colombia",          realHome:null,realAway:null,lockTime:"2026-06-17T21:00:00"},
    {id:63, phase:"groups",group:"K",date:"23 Jun",home:"Portugal",          away:"Uzbekistán",        realHome:null,realAway:null,lockTime:"2026-06-23T12:00:00"},
    {id:64, phase:"groups",group:"K",date:"23 Jun",home:"Colombia",          away:"Jamaica*",          realHome:null,realAway:null,lockTime:"2026-06-23T18:00:00"},
    {id:65, phase:"groups",group:"K",date:"27 Jun",home:"Colombia",          away:"Portugal",          realHome:null,realAway:null,lockTime:"2026-06-28T12:00:00"},
    {id:66, phase:"groups",group:"K",date:"27 Jun",home:"Jamaica*",          away:"Uzbekistán",        realHome:null,realAway:null,lockTime:"2026-06-28T12:00:00"},
    // GRUPO L
    {id:67, phase:"groups",group:"L",date:"17 Jun",home:"Inglaterra",        away:"Croacia",           realHome:null,realAway:null,lockTime:"2026-06-17T15:00:00"},
    {id:68, phase:"groups",group:"L",date:"17 Jun",home:"Ghana",             away:"Panamá",            realHome:null,realAway:null,lockTime:"2026-06-17T18:00:00"},
    {id:69, phase:"groups",group:"L",date:"23 Jun",home:"Inglaterra",        away:"Ghana",             realHome:null,realAway:null,lockTime:"2026-06-23T15:00:00"},
    {id:70, phase:"groups",group:"L",date:"23 Jun",home:"Panamá",            away:"Croacia",           realHome:null,realAway:null,lockTime:"2026-06-23T21:00:00"},
    {id:71, phase:"groups",group:"L",date:"27 Jun",home:"Panamá",            away:"Inglaterra",        realHome:null,realAway:null,lockTime:"2026-06-28T15:00:00"},
    {id:72, phase:"groups",group:"L",date:"27 Jun",home:"Croacia",           away:"Ghana",             realHome:null,realAway:null,lockTime:"2026-06-28T15:00:00"},
  ];
  return matches;
}

function generateElimMatches() {
  // Official FIFA 2026 playoff bracket
  // * = pending UEFA/IC playoff confirmation
  return [
    // ── DIECISEISAVOS (Ronda de 32) ─────────────────────────────────────
    {id:1001,phase:"round32",label:"Ronda de 32",matchNum:1, date:"28 Jun",desc:"2º Grupo A vs 2º Grupo B",        home:"2º Grupo A",    away:"2º Grupo B",    realHome:null,realAway:null},
    {id:1002,phase:"round32",label:"Ronda de 32",matchNum:2, date:"29 Jun",desc:"1º Grupo E vs 3º A/B/C/D/F",     home:"1º Grupo E",    away:"3º A/B/C/D/F",  realHome:null,realAway:null},
    {id:1003,phase:"round32",label:"Ronda de 32",matchNum:3, date:"29 Jun",desc:"1º Grupo F vs 2º Grupo C",       home:"1º Grupo F",    away:"2º Grupo C",    realHome:null,realAway:null},
    {id:1004,phase:"round32",label:"Ronda de 32",matchNum:4, date:"29 Jun",desc:"1º Grupo C vs 2º Grupo F",       home:"1º Grupo C",    away:"2º Grupo F",    realHome:null,realAway:null},
    {id:1005,phase:"round32",label:"Ronda de 32",matchNum:5, date:"30 Jun",desc:"1º Grupo I vs 3º C/D/F/G/H",     home:"1º Grupo I",    away:"3º C/D/F/G/H",  realHome:null,realAway:null},
    {id:1006,phase:"round32",label:"Ronda de 32",matchNum:6, date:"30 Jun",desc:"2º Grupo E vs 2º Grupo I",       home:"2º Grupo E",    away:"2º Grupo I",    realHome:null,realAway:null},
    {id:1007,phase:"round32",label:"Ronda de 32",matchNum:7, date:"30 Jun",desc:"1º Grupo A vs 3º C/E/F/H/I",     home:"1º Grupo A",    away:"3º C/E/F/H/I",  realHome:null,realAway:null},
    {id:1008,phase:"round32",label:"Ronda de 32",matchNum:8, date:"1 Jul", desc:"1º Grupo L vs 3º E/H/I/J/K",     home:"1º Grupo L",    away:"3º E/H/I/J/K",  realHome:null,realAway:null},
    {id:1009,phase:"round32",label:"Ronda de 32",matchNum:9, date:"1 Jul", desc:"1º Grupo D vs 3º B/E/F/I/J",     home:"1º Grupo D",    away:"3º B/E/F/I/J",  realHome:null,realAway:null},
    {id:1010,phase:"round32",label:"Ronda de 32",matchNum:10,date:"1 Jul", desc:"1º Grupo G vs 3º A/E/H/I/J",     home:"1º Grupo G",    away:"3º A/E/H/I/J",  realHome:null,realAway:null},
    {id:1011,phase:"round32",label:"Ronda de 32",matchNum:11,date:"2 Jul", desc:"2º Grupo K vs 2º Grupo L",       home:"2º Grupo K",    away:"2º Grupo L",    realHome:null,realAway:null},
    {id:1012,phase:"round32",label:"Ronda de 32",matchNum:12,date:"2 Jul", desc:"1º Grupo H vs 2º Grupo J",       home:"1º Grupo H",    away:"2º Grupo J",    realHome:null,realAway:null},
    {id:1013,phase:"round32",label:"Ronda de 32",matchNum:13,date:"2 Jul", desc:"1º Grupo B vs 3º E/F/G/I/J",     home:"1º Grupo B",    away:"3º E/F/G/I/J",  realHome:null,realAway:null},
    {id:1014,phase:"round32",label:"Ronda de 32",matchNum:14,date:"2 Jul", desc:"1º Grupo J vs 2º Grupo H",       home:"1º Grupo J",    away:"2º Grupo H",    realHome:null,realAway:null},
    {id:1015,phase:"round32",label:"Ronda de 32",matchNum:15,date:"3 Jul", desc:"1º Grupo K vs 3º D/E/I/J/L",     home:"1º Grupo K",    away:"3º D/E/I/J/L",  realHome:null,realAway:null},
    {id:1016,phase:"round32",label:"Ronda de 32",matchNum:16,date:"3 Jul", desc:"2º Grupo D vs 2º Grupo G",       home:"2º Grupo D",    away:"2º Grupo G",    realHome:null,realAway:null},
    // ── OCTAVOS (Ronda de 16) ────────────────────────────────────────────
    {id:1017,phase:"round16",label:"Octavos de Final",matchNum:1,date:"4 Jul",desc:"Gan. P74 vs Gan. P77",  home:"Gan. P74",away:"Gan. P77",realHome:null,realAway:null},
    {id:1018,phase:"round16",label:"Octavos de Final",matchNum:2,date:"4 Jul",desc:"Gan. P73 vs Gan. P75",  home:"Gan. P73",away:"Gan. P75",realHome:null,realAway:null},
    {id:1019,phase:"round16",label:"Octavos de Final",matchNum:3,date:"5 Jul",desc:"Gan. P76 vs Gan. P78",  home:"Gan. P76",away:"Gan. P78",realHome:null,realAway:null},
    {id:1020,phase:"round16",label:"Octavos de Final",matchNum:4,date:"5 Jul",desc:"Gan. P79 vs Gan. P80",  home:"Gan. P79",away:"Gan. P80",realHome:null,realAway:null},
    {id:1021,phase:"round16",label:"Octavos de Final",matchNum:5,date:"6 Jul",desc:"Gan. P83 vs Gan. P84",  home:"Gan. P83",away:"Gan. P84",realHome:null,realAway:null},
    {id:1022,phase:"round16",label:"Octavos de Final",matchNum:6,date:"6 Jul",desc:"Gan. P81 vs Gan. P82",  home:"Gan. P81",away:"Gan. P82",realHome:null,realAway:null},
    {id:1023,phase:"round16",label:"Octavos de Final",matchNum:7,date:"7 Jul",desc:"Gan. P86 vs Gan. P88",  home:"Gan. P86",away:"Gan. P88",realHome:null,realAway:null},
    {id:1024,phase:"round16",label:"Octavos de Final",matchNum:8,date:"7 Jul",desc:"Gan. P85 vs Gan. P87",  home:"Gan. P85",away:"Gan. P87",realHome:null,realAway:null},
    // ── CUARTOS DE FINAL ────────────────────────────────────────────────
    {id:1025,phase:"quarters",label:"Cuartos de Final",matchNum:1,date:"9 Jul", desc:"Gan. P89 vs Gan. P90",home:"Gan. P89",away:"Gan. P90",realHome:null,realAway:null},
    {id:1026,phase:"quarters",label:"Cuartos de Final",matchNum:2,date:"10 Jul",desc:"Gan. P93 vs Gan. P94",home:"Gan. P93",away:"Gan. P94",realHome:null,realAway:null},
    {id:1027,phase:"quarters",label:"Cuartos de Final",matchNum:3,date:"11 Jul",desc:"Gan. P91 vs Gan. P92",home:"Gan. P91",away:"Gan. P92",realHome:null,realAway:null},
    {id:1028,phase:"quarters",label:"Cuartos de Final",matchNum:4,date:"11 Jul",desc:"Gan. P95 vs Gan. P96",home:"Gan. P95",away:"Gan. P96",realHome:null,realAway:null},
    // ── SEMIFINALES ─────────────────────────────────────────────────────
    {id:1029,phase:"semis",label:"Semifinales",matchNum:1,date:"14 Jul",desc:"Gan. P97 vs Gan. P98",  home:"Gan. CF-1",away:"Gan. CF-2",realHome:null,realAway:null},
    {id:1030,phase:"semis",label:"Semifinales",matchNum:2,date:"15 Jul",desc:"Gan. P99 vs Gan. P100", home:"Gan. CF-3",away:"Gan. CF-4",realHome:null,realAway:null},
    // ── TERCER LUGAR ────────────────────────────────────────────────────
    {id:1031,phase:"third",label:"Tercer Lugar",matchNum:1,date:"18 Jul",desc:"Per. SF1 vs Per. SF2", home:"Per. SF-1",away:"Per. SF-2",realHome:null,realAway:null},
    // ── GRAN FINAL ──────────────────────────────────────────────────────
    {id:1032,phase:"final",label:"Gran Final",matchNum:1,date:"19 Jul",desc:"Gan. SF1 vs Gan. SF2",  home:"Gan. SF-1",away:"Gan. SF-2",realHome:null,realAway:null},
  ];
}

const INITIAL_MATCHES = [...generateGroupMatches(), ...generateElimMatches()];

// SCORING
function calcPoints(predH, predA, realH, realA) {
  if (realH===null||realA===null||predH===null||predA===null) return null;
  const ph=Number(predH),pa=Number(predA),rh=Number(realH),ra=Number(realA);
  if (isNaN(ph)||isNaN(pa)||isNaN(rh)||isNaN(ra)) return null;
  if (ph===rh&&pa===ra) return 5;
  const pw=ph>pa?"H":ph<pa?"A":"D";
  const rw=rh>ra?"H":rh<ra?"A":"D";
  if (pw===rw) return 3;
  return 0;
}

// Calculate group standings from a set of match results (either real or predicted)
function calcGroupStandings(groupName, allMatches, getScore) {
  const teams = GROUPS[groupName];
  const standings = {};
  teams.forEach(t => { standings[t] = {team:t, pts:0, gf:0, ga:0, gd:0, played:0}; });

  allMatches.filter(m => m.phase==="groups" && m.group===groupName).forEach(m => {
    const score = getScore(m);
    if (!score) return;
    const {h, a} = score;
    if (h===null||a===null||isNaN(h)||isNaN(a)) return;
    if (!standings[m.home]||!standings[m.away]) return;
    standings[m.home].played++; standings[m.away].played++;
    standings[m.home].gf+=h; standings[m.home].ga+=a;
    standings[m.away].gf+=a; standings[m.away].ga+=h;
    standings[m.home].gd+=h-a; standings[m.away].gd+=a-h;
    if (h>a) { standings[m.home].pts+=3; }
    else if (h<a) { standings[m.away].pts+=3; }
    else { standings[m.home].pts+=1; standings[m.away].pts+=1; }
  });

  return Object.values(standings)
    .sort((a,b) => b.pts-a.pts || b.gd-a.gd || b.gf-a.gf);
}

// Get top 2 + best 3rd for each group
function calcAllClassified(allMatches, getScore) {
  const result = { byGroup:{}, thirdPlaces:[] };
  Object.keys(GROUPS).forEach(grp => {
    const standings = calcGroupStandings(grp, allMatches, getScore);
    // Only count if group has enough played matches
    const played = standings.filter(s=>s.played>0);
    if (played.length < 2) return;
    result.byGroup[grp] = standings;
    if (standings[0]?.played>0) result.byGroup[grp+"_1st"] = standings[0].team;
    if (standings[1]?.played>0) result.byGroup[grp+"_2nd"] = standings[1].team;
    if (standings[2]?.played>0) result.thirdPlaces.push({...standings[2], group:grp});
  });
  // Best 8 third places
  result.top8thirds = result.thirdPlaces
    .sort((a,b) => b.pts-a.pts || b.gd-a.gd || b.gf-a.gf)
    .slice(0,8)
    .map(t=>t.team);
  return result;
}

// Calculate bonus points for classification predictions
function calcClassificationBonus(predictions, allMatches) {
  // Check if real results have enough data
  const realGroupMatches = allMatches.filter(m=>m.phase==="groups"&&m.realHome!==null);
  if (realGroupMatches.length === 0) return {bonus:0, details:[]};

  // Real classified
  const realClassified = calcAllClassified(allMatches, m=>({h:m.realHome, a:m.realAway}));

  // Predicted classified (from participant's predictions)
  const predClassified = calcAllClassified(allMatches, m=>{
    const pred = predictions?.[m.id];
    if (!pred||pred.home===null||pred.away===null) return null;
    return {h:Number(pred.home), a:Number(pred.away)};
  });

  let bonus = 0;
  const details = [];

  // Check 1st and 2nd place for each group
  Object.keys(GROUPS).forEach(grp => {
    ["1st","2nd"].forEach(pos => {
      const key = grp+"_"+pos;
      const real = realClassified.byGroup[key];
      const pred = predClassified.byGroup[key];
      if (!real||!pred) return;
      if (pred===real) {
        bonus+=10;
        details.push({type:"group_pos", grp, pos, team:real, pts:10, msg:"Acerto "+pos+" del Grupo "+grp+": "+real+" (10pts)"});
      } else {
        // Check if predicted team classified but wrong position
        const realGrp = realClassified.byGroup[grp];
        if (realGrp && realGrp.slice(0,2).some(s=>s.team===pred)) {
          bonus+=5;
          details.push({type:"group_team", grp, pos, team:pred, pts:5, msg:"Acerto clasificado Grupo "+grp+": "+pred+" (5pts)"});
        }
      }
    });
  });

  // Check best 8 thirds
  const realTop8 = realClassified.top8thirds;
  const predTop8 = predClassified.top8thirds;
  if (realTop8.length>0 && predTop8.length>0) {
    predTop8.forEach((team,i) => {
      if (realTop8[i]===team) {
        bonus+=10;
        details.push({type:"third_pos", team, pts:10, msg:"Acerto mejor 3ro posicion "+(i+1)+": "+team+" (10pts)"});
      } else if (realTop8.includes(team)) {
        bonus+=5;
        details.push({type:"third_team", team, pts:5, msg:"Acerto mejor 3ro: "+team+" (5pts)"});
      }
    });
  }

  return {bonus, details};
}

function calcParticipantPoints(predictions, matches, invoices) {
  let total=0, exact=0, correct=0;
  matches.forEach(m => {
    const pred=predictions?.[m.id];
    if (!pred) return;
    const pts=calcPoints(pred.home,pred.away,m.realHome,m.realAway);
    if (pts===null) return;
    total+=pts;
    if (pts===5) exact++;
    if (pts>=3) correct++;
  });
  const invPts = (invoices||[])
    .filter(inv=>inv.status==="approved")
    .reduce((sum,inv)=>sum+calcInvoicePoints(inv.amount),0);
  total += invPts;
  return {total, exact, correct, invPts};
}

// BRAND
const BRAND = {
  red: "#d3172e",
  redDark: "#a8101f",
  redLight: "#f5e6e8",
  white: "#ffffff",
  gray50: "#f9fafb",
  gray100: "#f3f4f6",
  gray200: "#e5e7eb",
  gray400: "#9ca3af",
  gray600: "#4b5563",
  gray900: "#111827",
  black: "#0a0a0a",
};

// STYLES
const S = {
  app: {
    minHeight:"100vh",
    background:BRAND.gray50,
    fontFamily:"'Segoe UI', system-ui, sans-serif",
    color:BRAND.gray900,
  },
  header: {
    background:BRAND.white,
    borderBottom:"3px solid "+BRAND.red,
    position:"sticky", top:0, zIndex:100,
    boxShadow:"0 2px 12px rgba(0,0,0,0.08)",
  },
  headerInner: {
    maxWidth:1000, margin:"0 auto",
    display:"flex", alignItems:"center", justifyContent:"space-between",
    padding:"10px 16px", flexWrap:"wrap", gap:8,
  },
  logo: {
    display:"flex", alignItems:"center", gap:10,
  },
  nav: {display:"flex", gap:4, flexWrap:"wrap"},
  navBtn: (active) => ({
    background: active?BRAND.red:"transparent",
    color: active?"#ffffff":"#111827",
    border:"1.5px solid "+(active?BRAND.red:BRAND.gray200),
    borderRadius:6, padding:"6px 14px",
    cursor:"pointer", fontSize:"0.78rem",
    fontWeight:700, letterSpacing:0.5,
    transition:"all .15s",
  }),
  main: {maxWidth:1000, margin:"0 auto", padding:"20px 14px"},
  card: {
    background:BRAND.white,
    border:"1px solid "+BRAND.gray200,
    borderRadius:12, padding:18, marginBottom:14,
    boxShadow:"0 1px 4px rgba(0,0,0,0.05)",
  },
  sectionTitle: {
    fontSize:"0.85rem", fontWeight:800, letterSpacing:2,
    color:BRAND.red, borderBottom:"2px solid "+BRAND.gray100,
    paddingBottom:8, marginBottom:14,
    textTransform:"uppercase",
  },
  input: {
    background:BRAND.gray50, border:"1.5px solid "+BRAND.gray200,
    color:BRAND.gray900, borderRadius:8, padding:"9px 12px",
    fontSize:"0.95rem", width:"100%",
    fontFamily:"inherit", outline:"none",
    boxSizing:"border-box",
    transition:"border .15s",
  },
  scoreInput: {
    background:BRAND.gray50, border:"1.5px solid "+BRAND.gray200,
    color:BRAND.gray900, borderRadius:6, padding:"5px 0",
    fontSize:"1rem", fontWeight:700, width:46,
    textAlign:"center", fontFamily:"inherit", outline:"none",
  },
  btn: (color=BRAND.red, outline=false) => ({
    background: outline?"transparent":color,
    color: outline?color:BRAND.white,
    border:"2px solid "+color,
    borderRadius:8, padding:"8px 18px",
    cursor:"pointer", fontSize:"0.85rem",
    fontWeight:700, fontFamily:"inherit",
    transition:"opacity .15s",
  }),
  matchRow: {
    display:"grid",
    gridTemplateColumns:"1fr 46px 10px 46px 1fr",
    gap:5, alignItems:"center",
    background:BRAND.gray50, border:"1px solid "+BRAND.gray200,
    borderRadius:8, padding:"7px 10px", marginBottom:5,
  },
  badge: (pts) => ({
    display:"inline-block",
    background:pts===5?"#16a34a":pts===3?"#2563eb":pts===0?"#dc2626":BRAND.gray200,
    color:pts===null?BRAND.gray600:"#fff",
    borderRadius:20, padding:"2px 8px",
    fontSize:"0.78rem", fontWeight:700,
    minWidth:26, textAlign:"center",
  }),
  leaderRow: (i) => ({
    background:i===0?"#fff0f2":i===1?"#fafafa":i===2?"#fffbf0":BRAND.white,
    border:"1.5px solid "+(i===0?BRAND.red:i===1?"#9ca3af":i===2?"#d4a017":BRAND.gray200),
    borderRadius:10, padding:"10px 16px",
    display:"flex", alignItems:"center", gap:12,
    marginBottom:7,
  }),
  groupHeader: (color) => ({
    background:color+"15", borderLeft:"4px solid "+color,
    padding:"6px 12px", borderRadius:"0 8px 8px 0",
    marginBottom:7, marginTop:14,
    fontSize:"0.85rem", fontWeight:800,
    letterSpacing:2, color:color,
  }),
  phaseHeader: (color) => ({
    background:color, borderRadius:8,
    padding:"8px 14px", fontSize:"0.85rem",
    fontWeight:800, letterSpacing:2,
    marginBottom:8, marginTop:16,
    color:"#fff",
  }),
  invoiceCard: (status) => ({
    background:BRAND.gray50,
    border:"1px solid "+(status==="approved"?"#16a34a44":status==="rejected"?"#dc262644":BRAND.red+"44"),
    borderRadius:8, padding:"12px 14px", marginBottom:8,
    display:"flex", alignItems:"center", justifyContent:"space-between", gap:10,
    flexWrap:"wrap",
  }),
  statusBadge: (status) => ({
    display:"inline-block",
    background:status==="approved"?"#16a34a":status==="rejected"?"#dc2626":"#d97706",
    color:"#fff", borderRadius:20,
    padding:"3px 10px", fontSize:"0.75rem", fontWeight:700,
  }),
};

const FontStyle = () => (
  <style>{`
    * { box-sizing:border-box; color:inherit; }
    body { color:#111827; background:#f9fafb; }
    input, button, select, textarea { font-family:inherit; }
    input[type=number]::-webkit-inner-spin-button { -webkit-appearance:none; }
    input[type=number] { -moz-appearance:textfield; }
    ::-webkit-scrollbar { width:5px; }
    ::-webkit-scrollbar-thumb { background:#e5e7eb; border-radius:3px; }
    @keyframes fadeIn { from{opacity:0;transform:translateY(6px)} to{opacity:1;transform:translateY(0)} }
    .fi { animation:fadeIn .3s ease forwards; }
    @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.4} }
    .pulse { animation:pulse 2s infinite; }
    button:hover { opacity:.82; }
    input:focus { border-color:#d3172e !important; box-shadow:0 0 0 3px #d3172e18; }
    button { color:inherit; }
  `}</style>
);

// LEADERBOARD
function Leaderboard({ participants, matches, invoices }) {
  const [activeTab, setActiveTab] = useState("tabla");

  const ranked = [...participants]
    .map(p => {
      const userInvoices = (invoices||[]).filter(inv => inv.participantId === p.id && inv.status === "approved");
      const invPts = userInvoices.reduce((sum, inv) => sum + calcInvoicePoints(inv.amount), 0);
      let gamePts = 0, exact = 0, correct = 0;
      matches.forEach(m => {
        const pred = p.predictions?.[m.id];
        if (!pred) return;
        const pts = calcPoints(pred.home, pred.away, m.realHome, m.realAway);
        if (pts === null) return;
        gamePts += pts;
        if (pts === 5) exact++;
        if (pts >= 3) correct++;
      });
      const {bonus: classPts} = calcClassificationBonus(p.predictions, matches);
      return {...p, total: gamePts + invPts + classPts, gamePts, exact, correct, invPts, classPts};
    })
    .sort((a,b) => b.total - a.total || b.exact - a.exact);

  const top20 = ranked.slice(0, 20);

  return (
    <div className="fi">
      <div style={{display:"flex", gap:6, marginBottom:16, flexWrap:"wrap"}}>
        {[["tabla","Normas"],["top20","Clasificacion General"]].map(([t,l])=>(
          <button key={t} style={S.navBtn(activeTab===t)} onClick={()=>setActiveTab(t)}>{l}</button>
        ))}
      </div>

      {activeTab==="top20" && (
        <div style={{...S.card, padding:0, overflow:"hidden"}}>
          <div style={{background:BRAND.red, padding:"12px 18px"}}>
            <div style={{color:"#fff", fontWeight:800, fontSize:"1rem", letterSpacing:1}}>CLASIFICACION GENERAL — {ranked.length} PARTICIPANTES</div>
          </div>
          {ranked.length===0 && (
            <div style={{textAlign:"center", color:"#9ca3af", padding:30}}>Aun no hay participantes</div>
          )}
          {ranked.map((p, i) => (
            <div key={p.id} style={{
              display:"flex", alignItems:"center", gap:12,
              padding:"10px 18px",
              background: i%2===0 ? "#fff" : BRAND.gray50,
              borderBottom:"1px solid "+BRAND.gray100,
            }}>
              <div style={{
                width:32, height:32, borderRadius:"50%",
                background: i===0?BRAND.red:i===1?"#9ca3af":i===2?"#d97706":BRAND.gray100,
                color: i<3?"#fff":BRAND.gray600,
                display:"flex", alignItems:"center", justifyContent:"center",
                fontWeight:800, fontSize:"0.85rem", flexShrink:0,
              }}>{i+1}</div>
              <div style={{flex:1}}>
                <div style={{fontWeight:700, fontSize:"0.95rem", color:BRAND.gray900}}>{p.name}</div>
                <div style={{fontSize:"0.72rem", color:"#9ca3af", marginTop:1}}>
                  {p.exact} exactos · {p.correct} acertados
                  {p.invPts > 0 && <span style={{color:BRAND.red}}> · +{p.invPts}pts facturas</span>}
                  {p.classPts > 0 && <span style={{color:"#7c3aed"}}> · +{p.classPts}pts clasificados</span>}
                </div>
              </div>
              <div style={{textAlign:"right"}}>
                <div style={{fontSize:"1.4rem", fontWeight:800, color: i===0?BRAND.red:BRAND.gray900}}>{p.total}</div>
                <div style={{fontSize:"0.65rem", color:"#9ca3af"}}>PTS</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {activeTab==="tabla" && (
        <>
          <div style={{...S.card}}>
            <div style={S.sectionTitle}>Sistema de Puntos</div>
            <div style={{marginBottom:14}}>
              <div style={{fontSize:"0.75rem",color:BRAND.red,fontWeight:700,marginBottom:8,letterSpacing:1}}>PRONOSTICOS</div>
              <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(120px,1fr))",gap:8}}>
                {[["5 pts","Resultado exacto","#16a34a"],["3 pts","Ganador correcto","#2563eb"],["0 pts","Resultado fallado","#dc2626"]].map(([pts,desc,color])=>(
                  <div key={pts} style={{background:BRAND.gray50,border:"1px solid "+color+"33",borderRadius:10,padding:"10px",textAlign:"center"}}>
                    <div style={{fontSize:"1.5rem",fontWeight:800,color}}>{pts}</div>
                    <div style={{color:"#6b7280",fontSize:"0.75rem",marginTop:2}}>{desc}</div>
                  </div>
                ))}
              </div>
            </div>
            <div style={{marginBottom:14}}>
              <div style={{fontSize:"0.75rem",color:BRAND.red,fontWeight:700,marginBottom:8,letterSpacing:1}}>CLASIFICADOS DE GRUPOS</div>
              <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(150px,1fr))",gap:8}}>
                {[["10 pts","Equipo + posicion correcta","#16a34a"],["5 pts","Solo equipo correcto","#2563eb"]].map(([pts,desc,color])=>(
                  <div key={pts} style={{background:BRAND.gray50,border:"1px solid "+color+"33",borderRadius:10,padding:"10px",textAlign:"center"}}>
                    <div style={{fontSize:"1.5rem",fontWeight:800,color}}>{pts}</div>
                    <div style={{color:"#6b7280",fontSize:"0.75rem",marginTop:2}}>{desc}</div>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <div style={{fontSize:"0.75rem",color:BRAND.red,fontWeight:700,marginBottom:8,letterSpacing:1}}>FACTURAS (CAD)</div>
              <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(100px,1fr))",gap:8}}>
                {[["1 pt","$10-$50","#16a34a"],["3 pts","$51-$100","#2563eb"],["6 pts","$101-$150","#7c3aed"],["9 pts","$151-$200",BRAND.red],["12 pts","+$201",BRAND.redDark]].map(([pts,range,color])=>(
                  <div key={pts} style={{background:BRAND.gray50,border:"1px solid "+color+"33",borderRadius:10,padding:"10px",textAlign:"center"}}>
                    <div style={{fontSize:"1.3rem",fontWeight:800,color}}>{pts}</div>
                    <div style={{color:"#6b7280",fontSize:"0.75rem",marginTop:2}}>{range}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// INVOICE FORM
function InvoiceForm({ currentUser, invoices, setInvoices }) {
  const [invoiceNum, setInvoiceNum] = useState("");
  const [amount, setAmount] = useState("");
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);

  const myInvoices = invoices.filter(inv=>inv.participantId===currentUser.id);
  const approvedPts = myInvoices.filter(inv=>inv.status==="approved")
    .reduce((sum,inv)=>sum+calcInvoicePoints(inv.amount),0);

  async function handleSubmit() {
    if (!invoiceNum.trim()) { alert("Ingresa el numero de factura"); return; }
    if (!amount || parseFloat(amount)<10) { alert("El monto minimo es $10 CAD"); return; }
    const alreadyExists = invoices.find(inv=>inv.invoiceNum===invoiceNum.trim());
    if (alreadyExists) { alert("Esta factura ya fue registrada"); return; }

    setSaving(true);
    try {
      const newInvoice = {
        id: Date.now(),
        participantId: currentUser.id,
        participantName: currentUser.name,
        invoiceNum: invoiceNum.trim(),
        amount: parseFloat(amount),
        points: calcInvoicePoints(amount),
        status: "pending",
        createdAt: new Date().toISOString(),
      };
      const updated = [...invoices, newInvoice];
      await setDoc(INVOICES_DOC, {list: updated});
      setInvoices(updated);
      setInvoiceNum("");
      setAmount("");
      setSuccess(true);
      setTimeout(()=>setSuccess(false), 3000);
    } catch(e) {
      alert("Error: "+e.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={S.card}>
      <div style={S.sectionTitle}>Registrar Factura</div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:14}}>
        <div>
          <label style={{fontSize:"0.75rem",color:"#d3172e",letterSpacing:2,display:"block",marginBottom:5}}>
            NUMERO DE FACTURA
          </label>
          <input style={S.input} placeholder="Ej: FAC-001234"
            value={invoiceNum} onChange={e=>setInvoiceNum(e.target.value)} />
        </div>
        <div>
          <label style={{fontSize:"0.75rem",color:"#d3172e",letterSpacing:2,display:"block",marginBottom:5}}>
            MONTO (CAD $)
          </label>
          <input style={S.input} type="number" min="10" placeholder="Ej: 150.00"
            value={amount} onChange={e=>setAmount(e.target.value)} />
        </div>
      </div>
      {amount && parseFloat(amount)>=10 && (
        <div style={{background:"#0d2215",border:"1px solid #27ae6044",borderRadius:8,padding:"10px 14px",marginBottom:12,fontSize:"0.85rem"}}>
          Esta factura vale <strong style={{color:"#16a34a",fontSize:"1rem"}}>{calcInvoicePoints(amount)} puntos</strong> si es aprobada
        </div>
      )}
      {success && (
        <div style={{background:"#0d2215",border:"1px solid #27ae60",borderRadius:8,padding:"10px 14px",marginBottom:12,color:"#16a34a",fontSize:"0.85rem",fontWeight:700}}>
          Factura enviada! Pendiente de aprobacion por el administrador.
        </div>
      )}
      <button style={S.btn()} onClick={handleSubmit} disabled={saving}>
        {saving?"Enviando...":"Enviar Factura"}
      </button>

      {myInvoices.length>0 && (
        <div style={{marginTop:20}}>
          <div style={{fontSize:"0.8rem",color:"#d3172e",fontWeight:700,letterSpacing:1,marginBottom:10}}>
            MIS FACTURAS ({myInvoices.length}) — {approvedPts} puntos acumulados
          </div>
          {myInvoices.map(inv=>(
            <div key={inv.id} style={S.invoiceCard(inv.status)}>
              <div>
                <div style={{fontWeight:700,fontSize:"0.9rem"}}>{inv.invoiceNum}</div>
                <div style={{color:"#6b7280",fontSize:"0.78rem",marginTop:2}}>
                  ${inv.amount} CAD &nbsp;|&nbsp; {inv.points} pts potenciales
                </div>
              </div>
              <div style={S.statusBadge(inv.status)}>
                {inv.status==="approved"?"Aprobada":inv.status==="rejected"?"Rechazada":"Pendiente"}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}


// REUSABLE GROUP TABLE COMPONENT
function GroupTable({ grp, table, hasData, emptyMsg }) {
  const gColor = GROUP_COLORS[grp];
  return (
    <div style={{...{background:"#ffffff",border:"1px solid #e5e7eb",borderRadius:12,padding:0,marginBottom:12},overflow:"hidden"}}>
      <div style={{background:gColor,padding:"7px 14px"}}>
        <span style={{color:"#fff",fontWeight:800,fontSize:"0.82rem",letterSpacing:1}}>GRUPO {grp}</span>
      </div>
      {!hasData ? (
        <div style={{padding:"12px 14px",color:"#9ca3af",fontSize:"0.8rem",textAlign:"center"}}>{emptyMsg}</div>
      ) : (
        <div style={{overflowX:"auto"}}>
          <table style={{width:"100%",borderCollapse:"collapse",fontSize:"0.76rem"}}>
            <thead>
              <tr style={{background:"#f9fafb",borderBottom:"2px solid #e5e7eb"}}>
                {["Pos","Equipo","PJ","G","E","P","GF","GC","GD","Pts"].map(h=>(
                  <th key={h} style={{padding:"5px 7px",textAlign:h==="Equipo"?"left":"center",color:"#4b5563",fontWeight:700,whiteSpace:"nowrap"}}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {table.map((s,i)=>{
                const gd=s.gf-s.gc;
                return (
                  <tr key={s.team} style={{borderBottom:"1px solid #f3f4f6",background:i<2?"#f0fdf4":i===2?"#fffbeb":"#fff"}}>
                    <td style={{padding:"6px 7px",textAlign:"center",fontWeight:800,color:i<2?"#d3172e":i===2?"#d97706":"#9ca3af"}}>{i+1}</td>
                    <td style={{padding:"6px 7px",fontWeight:700,color:"#111827",whiteSpace:"nowrap"}}>
                      <span style={{display:"inline-block",width:7,height:7,borderRadius:"50%",background:i<2?"#16a34a":i===2?"#d97706":"#e5e7eb",marginRight:5,verticalAlign:"middle"}}></span>
                      {s.team}
                    </td>
                    <td style={{padding:"6px 7px",textAlign:"center",color:"#4b5563"}}>{s.pj}</td>
                    <td style={{padding:"6px 7px",textAlign:"center",color:"#16a34a",fontWeight:600}}>{s.g}</td>
                    <td style={{padding:"6px 7px",textAlign:"center",color:"#4b5563"}}>{s.e}</td>
                    <td style={{padding:"6px 7px",textAlign:"center",color:"#dc2626"}}>{s.p}</td>
                    <td style={{padding:"6px 7px",textAlign:"center",color:"#4b5563"}}>{s.gf}</td>
                    <td style={{padding:"6px 7px",textAlign:"center",color:"#4b5563"}}>{s.gc}</td>
                    <td style={{padding:"6px 7px",textAlign:"center",fontWeight:700,color:gd>0?"#16a34a":gd<0?"#dc2626":"#4b5563"}}>{gd>0?"+"+gd:gd}</td>
                    <td style={{padding:"6px 7px",textAlign:"center",fontWeight:800,color:"#d3172e"}}>{s.pts}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <div style={{padding:"4px 12px",fontSize:"0.68rem",color:"#9ca3af",borderTop:"1px solid #f3f4f6"}}>
            Verde = clasificado · Amarillo = posible mejor 3ro
          </div>
        </div>
      )}
    </div>
  );
}

// PARTICIPANT FORM
const SUCURSALES = ["St-Hubert", "St-Laurent", "Brossard"];


function ProfileTab({ currentUser, setCurrentUser, participants, setParticipants, matches, invoices, preds }) {
  const [editMode, setEditMode] = useState(false);
  const [editNombre, setEditNombre] = useState(currentUser.nombre||"");
  const [editApellido, setEditApellido] = useState(currentUser.apellido||"");
  const [editTel, setEditTel] = useState(currentUser.telefono||"");
  const [editPin, setEditPin] = useState("");
  const [editPin2, setEditPin2] = useState("");
  const [editErr, setEditErr] = useState("");
  const [editOk, setEditOk] = useState(false);

  const userInv = (invoices||[]).filter(inv=>inv.participantId===currentUser.id&&inv.status==="approved");
  const invPts = userInv.reduce((sum,inv)=>sum+calcInvoicePoints(inv.amount), 0);
  let gamePts = 0;
  matches.forEach(m=>{const pred=preds[m.id];if(!pred)return;const pts=calcPoints(pred.home,pred.away,m.realHome,m.realAway);if(pts!==null)gamePts+=pts;});
  const {bonus:classPts} = calcClassificationBonus(preds, matches);
  const total = gamePts + invPts + classPts;

  const ranked = [...participants].map(p=>{
    const ui=(invoices||[]).filter(i=>i.participantId===p.id&&i.status==="approved");
    const ip=ui.reduce((s,i)=>s+calcInvoicePoints(i.amount),0);
    let gp=0; matches.forEach(m=>{const pr=p.predictions?.[m.id];if(!pr)return;const pts=calcPoints(pr.home,pr.away,m.realHome,m.realAway);if(pts!==null)gp+=pts;});
    const {bonus:cp}=calcClassificationBonus(p.predictions||{},matches);
    return {...p,_total:gp+ip+cp};
  }).sort((a,b)=>b._total-a._total);
  const pos = ranked.findIndex(p=>p.id===currentUser.id)+1;

  async function saveProfile() {
    setEditErr("");
    if(!editNombre.trim()||!editApellido.trim()){setEditErr("Nombre y apellido requeridos");return;}
    if(editPin&&editPin.length<6){setEditErr("PIN minimo 6 digitos");return;}
    if(editPin&&editPin!==editPin2){setEditErr("Los PINs no coinciden");return;}
    const updated={...currentUser,nombre:editNombre.trim(),apellido:editApellido.trim(),name:editNombre.trim()+" "+editApellido.trim(),telefono:editTel.trim(),...(editPin?{pin:editPin}:{})};
    const newList=[...participants.filter(p=>p.id!==currentUser.id),updated];
    await setDoc(PARTICIPANTS_DOC,{list:newList});
    setParticipants(newList);
    setCurrentUser(updated);
    try{localStorage.setItem("sl_user",JSON.stringify(updated));}catch(e){}
    setEditOk(true);setEditMode(false);setTimeout(()=>setEditOk(false),3000);
  }

  return (
    <div style={{maxWidth:480,margin:"0 auto"}}>
      <div style={{background:"linear-gradient(135deg,#d3172e,#a01020)",borderRadius:16,padding:"24px 20px",marginBottom:16,color:"#fff",textAlign:"center"}}>
        <div style={{width:64,height:64,borderRadius:"50%",background:"rgba(255,255,255,0.2)",margin:"0 auto 12px",display:"flex",alignItems:"center",justifyContent:"center",fontSize:"1.8rem",fontWeight:800}}>
          {(currentUser.nombre||"?")[0].toUpperCase()}
        </div>
        <div style={{fontSize:"1.3rem",fontWeight:800}}>{currentUser.nombre} {currentUser.apellido}</div>
        <div style={{fontSize:"0.85rem",opacity:0.85,marginTop:4}}>{currentUser.email}</div>
        <div style={{fontSize:"0.8rem",opacity:0.75,marginTop:2}}>{currentUser.sucursal}</div>
        <div style={{marginTop:16,display:"flex",justifyContent:"center",gap:20}}>
          <div style={{textAlign:"center"}}>
            <div style={{fontSize:"1.8rem",fontWeight:900}}>{total}</div>
            <div style={{fontSize:"0.7rem",opacity:0.8}}>PUNTOS TOTAL</div>
          </div>
          <div style={{width:1,background:"rgba(255,255,255,0.3)"}}></div>
          <div style={{textAlign:"center"}}>
            <div style={{fontSize:"1.8rem",fontWeight:900}}>#{pos}</div>
            <div style={{fontSize:"0.7rem",opacity:0.8}}>POSICIÓN</div>
          </div>
        </div>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10,marginBottom:16}}>
        {[["Pronósticos",gamePts,"#2563eb"],["Clasificados",classPts,"#7c3aed"],["Facturas",invPts,"#16a34a"]].map(([l,v,c])=>(
          <div key={l} style={{background:"#fff",border:"1px solid #e5e7eb",borderRadius:12,padding:"12px 8px",textAlign:"center"}}>
            <div style={{fontSize:"1.4rem",fontWeight:800,color:c}}>{v}</div>
            <div style={{fontSize:"0.7rem",color:"#6b7280",marginTop:2}}>{l}</div>
          </div>
        ))}
      </div>
      {editOk && <div style={{background:"#f0fdf4",border:"1px solid #16a34a",borderRadius:10,padding:"10px 14px",marginBottom:12,color:"#16a34a",fontWeight:600,fontSize:"0.85rem"}}>✅ Perfil actualizado</div>}
      {!editMode ? (
        <div style={{background:"#fff",border:"1px solid #e5e7eb",borderRadius:12,padding:16}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
            <div style={{fontWeight:700,fontSize:"0.95rem"}}>Mis datos</div>
            <button style={{...S.btn("#2563eb",true),fontSize:"0.78rem",padding:"5px 12px"}} onClick={()=>setEditMode(true)}>Editar</button>
          </div>
          {[["Nombre",currentUser.nombre+" "+currentUser.apellido],["Correo",currentUser.email],["Teléfono",currentUser.telefono||"-"],["Sucursal",currentUser.sucursal||"-"]].map(([l,v])=>(
            <div key={l} style={{display:"flex",justifyContent:"space-between",padding:"8px 0",borderBottom:"1px solid #f3f4f6",fontSize:"0.85rem"}}>
              <span style={{color:"#6b7280"}}>{l}</span>
              <span style={{fontWeight:600,color:"#111827"}}>{v}</span>
            </div>
          ))}
        </div>
      ) : (
        <div style={{background:"#fff",border:"1px solid #e5e7eb",borderRadius:12,padding:16}}>
          <div style={{fontWeight:700,fontSize:"0.95rem",marginBottom:12}}>Editar datos</div>
          {editErr && <div style={{color:"#e74c3c",fontSize:"0.82rem",marginBottom:8}}>{editErr}</div>}
          {[["Nombre",editNombre,setEditNombre],["Apellido",editApellido,setEditApellido],["Teléfono",editTel,setEditTel]].map(([l,v,sv])=>(
            <div key={l} style={{marginBottom:10}}>
              <label style={{fontSize:"0.75rem",color:BRAND.red,fontWeight:700,display:"block",marginBottom:4}}>{l.toUpperCase()}</label>
              <input style={S.input} value={v} onChange={e=>sv(e.target.value)} />
            </div>
          ))}
          <div style={{marginBottom:10}}>
            <label style={{fontSize:"0.75rem",color:BRAND.red,fontWeight:700,display:"block",marginBottom:4}}>NUEVO PIN (dejar vacío para no cambiar)</label>
            <input style={S.input} type="password" placeholder="Mínimo 6 dígitos" value={editPin} onChange={e=>setEditPin(e.target.value)} />
          </div>
          {editPin && (
            <div style={{marginBottom:10}}>
              <label style={{fontSize:"0.75rem",color:BRAND.red,fontWeight:700,display:"block",marginBottom:4}}>CONFIRMAR NUEVO PIN</label>
              <input style={S.input} type="password" value={editPin2} onChange={e=>setEditPin2(e.target.value)} />
            </div>
          )}
          <div style={{display:"flex",gap:8,marginTop:4}}>
            <button style={{...S.btn("#6b7280",true),flex:1}} onClick={()=>{setEditMode(false);setEditErr("");}}>Cancelar</button>
            <button style={{...S.btn(),flex:1}} onClick={saveProfile}>Guardar</button>
          </div>
        </div>
      )}
    </div>
  );
}

function ParticipantForm({ participants, setParticipants, matches, adminUnlocked, invoices, setInvoices, currentUser, setCurrentUser, initialStep }) {
  const [step, setStep] = useState(initialStep || (currentUser ? "form" : "login"));
  const [isNew, setIsNew] = useState(false);
  // Login
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPin, setLoginPin] = useState("");
  // Register
  const [regNombre, setRegNombre] = useState("");
  const [regApellido, setRegApellido] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regTel, setRegTel] = useState("");
  const [regSucursal, setRegSucursal] = useState("");
  const [regPin, setRegPin] = useState("");
  const [regPin2, setRegPin2] = useState("");
  const [preds, setPreds] = useState(currentUser?.predictions||{});
  const [activeGroup, setActiveGroup] = useState("A");
  const [activePhase, setActivePhase] = useState("groups");
  const [activePh, setActivePh] = useState("round32");
  const [activeTab, setActiveTab] = useState("pronosticos");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // Sync preds if participants reload from Firebase
  useEffect(() => {
    if (currentUser) {
      const fresh = participants.find(p=>p.id===currentUser.id);
      if (fresh) setPreds(fresh.predictions||{});
    }
  }, [participants]);

  const groupMatches = matches.filter(m=>m.phase==="groups");
  const elimMatches = matches.filter(m=>m.phase!=="groups");
  const phases = [...new Set(elimMatches.map(m=>m.phase))];
  const phaseLabels = {round32:"Ronda 32",round16:"Ronda 16",quarters:"Cuartos",semis:"Semis",third:"3er Lugar",final:"Final"};
  const phaseColors = {round32:"#0369a1",round16:"#7c3aed",quarters:"#c0392b",semis:"#e67e22",third:"#2980b9",final:"#d3172e"};

  const groupsLocked = isPhaseLocked("groups", adminUnlocked);

  function getLockMsg(phase) {
    const locked = isPhaseLocked(phase, adminUnlocked);
    if (!locked) {
      const d = LOCK_DATES[phase];
      if (d) {
        const diff = Math.ceil((d-new Date())/(1000*60*60*24));
        if (diff>0) return {locked:false, msg:"Abierto - se bloquea en "+diff+" dia"+(diff!==1?"s":"")};
      }
      return {locked:false, msg:"Abierto"};
    }
    return {locked:true, msg:"Bloqueado"};
  }

  function handleLogin() {
    setError("");
    if (!loginEmail.trim()) { setError("Ingresa tu correo"); return; }
    if (!loginPin.trim()||loginPin.length<4) { setError("PIN minimo 4 digitos"); return; }
    const existing = participants.find(p=>p.email&&p.email.toLowerCase()===loginEmail.trim().toLowerCase());
    if (!existing) { setError("Correo no registrado. Crea una cuenta nueva."); return; }
    if (existing.pin!==loginPin) { setError("PIN incorrecto"); return; }
    setCurrentUser(existing);
    setPreds(existing.predictions||{});
    setStep("form");
  }

  async function handleRegister() {
    setError("");
    if (!regNombre.trim()) { setError("Ingresa tu nombre"); return; }
    if (!regApellido.trim()) { setError("Ingresa tu apellido"); return; }
    if (!regEmail.trim()||!regEmail.includes("@")) { setError("Ingresa un correo valido"); return; }
    if (!regTel.trim()) { setError("Ingresa tu telefono"); return; }
    if (!regSucursal) { setError("Selecciona una sucursal"); return; }
    if (!regPin.trim()||regPin.length<6) { setError("PIN minimo 6 digitos"); return; }
    if (regPin!==regPin2) { setError("Los PINs no coinciden"); return; }
    const exists = participants.find(p=>p.email&&p.email.toLowerCase()===regEmail.trim().toLowerCase());
    if (exists) { setError("Este correo ya esta registrado. Inicia sesion."); return; }
    setSaving(true);
    try {
      const newUser = {
        id: Date.now(),
        nombre: regNombre.trim(),
        apellido: regApellido.trim(),
        name: regNombre.trim()+" "+regApellido.trim(),
        email: regEmail.trim().toLowerCase(),
        telefono: regTel.trim(),
        sucursal: regSucursal,
        pin: regPin,
        predictions: {},
        createdAt: new Date().toISOString(),
      };
      const newParticipants = [...participants, newUser];
      await setDoc(PARTICIPANTS_DOC, {list: newParticipants});
      setParticipants(newParticipants);
      setCurrentUser(newUser);
      setPreds({});
      try { localStorage.setItem("sl_user", JSON.stringify(newUser)); } catch(e){}
      setStep("form");
    } catch(e) {
      setError("Error al registrar: "+e.message);
    } finally {
      setSaving(false);
    }
  }

  function setPred(matchId, side, val) {
    const v = val===""?null:Math.max(0,parseInt(val)||0);
    setPreds(prev=>({...prev, [matchId]:{...(prev[matchId]||{}), [side]:v}}));
  }

  async function handleSave() {
    setSaving(true);
    try {
      const updatedUser = {...currentUser, predictions:preds};
      const newParticipants = [...participants.filter(p=>p.id!==currentUser.id), updatedUser];
      await setDoc(PARTICIPANTS_DOC, {list: newParticipants});
      setParticipants(newParticipants);
      try { localStorage.setItem("sl_user", JSON.stringify(updatedUser)); } catch(e){}
      setStep("done");
    } catch(e) {
      alert("Error al guardar: "+e.message);
    } finally {
      setSaving(false);
    }
  }

  function renderMatchRow(m, locked=false) {
    const pred = preds[m.id]||{};
    const pts = calcPoints(pred.home, pred.away, m.realHome, m.realAway);
    const lockTime = m.lockTime ? new Date(m.lockTime) : null;
    const now = new Date();
    const minutesLeft = lockTime ? Math.round((lockTime - now) / 60000) : null;
    const closingSoon = minutesLeft !== null && minutesLeft > 0 && minutesLeft <= 60;
    return (
      <div key={m.id} style={{...S.matchRow, opacity:(m.home==="Por definir"||m.home?.startsWith("Gan.")||m.home?.startsWith("Per."))?.55:1}}>
        <div style={{textAlign:"right",fontSize:"0.85rem",fontWeight:600}}>{m.home}</div>
        <input type="number" min="0" max="99" placeholder="-"
          style={{...S.scoreInput, background:locked?"#f9fafb":"#f3f4f6", cursor:locked?"not-allowed":"text"}}
          value={pred.home??""} disabled={locked}
          onChange={e=>!locked&&setPred(m.id,"home",e.target.value)} />
        <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:2}}>
          <div style={{textAlign:"center",color:"#9ca3af",fontSize:"0.68rem",fontWeight:700}}>VS</div>
          {locked && <div style={{fontSize:"0.58rem",color:"#e74c3c",fontWeight:700}}>🔒</div>}
          {closingSoon && <div style={{fontSize:"0.58rem",color:"#e67e22",fontWeight:700}}>⏱{minutesLeft}m</div>}
        </div>
        <input type="number" min="0" max="99" placeholder="-"
          style={{...S.scoreInput, background:locked?"#f9fafb":"#f3f4f6", cursor:locked?"not-allowed":"text"}}
          value={pred.away??""} disabled={locked}
          onChange={e=>!locked&&setPred(m.id,"away",e.target.value)} />
        <div style={{textAlign:"left",fontSize:"0.85rem",fontWeight:600}}>{m.away}</div>
        {pts!==null && <div style={{...S.badge(pts),marginLeft:6}}>{pts}pts</div>}
      </div>
    );
  }

  const selectStyle = {...S.input, appearance:"none", WebkitAppearance:"none", cursor:"pointer"};

  if (step==="login") return (
    <div className="fi" style={{maxWidth:460,margin:"0 auto"}}>
      <div style={S.card}>
        <div style={{display:"flex",borderBottom:"2px solid "+BRAND.gray100,marginBottom:20}}>
          {[["login","Ya tengo cuenta"],["register","Registrarme"]].map(([t,l])=>(
            <button key={t} onClick={()=>{setIsNew(t==="register");setError("");}}
              style={{flex:1,padding:"10px",border:"none",background:"transparent",
                fontWeight:700,fontSize:"0.85rem",cursor:"pointer",
                color:(!isNew&&t==="login")||(isNew&&t==="register")?BRAND.red:"#9ca3af",
                borderBottom:"2px solid "+((!isNew&&t==="login")||(isNew&&t==="register")?BRAND.red:"transparent"),
                marginBottom:"-2px",
              }}>{l}</button>
          ))}
        </div>

        {!isNew && (
          <>
            <div style={S.sectionTitle}>Iniciar Sesion</div>
            <div style={{marginBottom:12}}>
              <label style={{fontSize:"0.72rem",color:BRAND.red,letterSpacing:1,display:"block",marginBottom:5,fontWeight:700}}>CORREO ELECTRONICO</label>
              <input style={S.input} type="email" placeholder="tu@correo.com"
                value={loginEmail} onChange={e=>setLoginEmail(e.target.value)}
                onKeyDown={e=>e.key==="Enter"&&handleLogin()} />
            </div>
            <div style={{marginBottom:16}}>
              <label style={{fontSize:"0.72rem",color:BRAND.red,letterSpacing:1,display:"block",marginBottom:5,fontWeight:700}}>PIN</label>
              <input style={S.input} type="password" placeholder="****"
                value={loginPin} onChange={e=>setLoginPin(e.target.value.replace(/\D/g,""))}
                onKeyDown={e=>e.key==="Enter"&&handleLogin()} />
            </div>
            {error && <div style={{color:"#dc2626",marginBottom:12,fontSize:"0.85rem",background:"#fef2f2",padding:"8px 12px",borderRadius:6}}>{error}</div>}
            <button style={{...S.btn(),width:"100%"}} onClick={handleLogin}>Entrar</button>
            <button style={{...S.btn("#6b7280",true),width:"100%",marginTop:8}} onClick={()=>{setIsNew(true);setError("");}}>Crear cuenta nueva</button>
            <button style={{background:"transparent",border:"none",color:"#2563eb",fontSize:"0.82rem",marginTop:10,cursor:"pointer",textDecoration:"underline",width:"100%",textAlign:"center"}}
              onClick={()=>{
                const email=loginEmail.trim().toLowerCase();
                if(!email||!email.includes("@")){setError("Ingresa tu correo primero para recuperar el PIN");return;}
                const user=participants.find(p=>p.email&&p.email.toLowerCase()===email);
                if(!user){setError("No encontramos ese correo registrado");return;}
                setError("");
                alert("Tu PIN es: "+user.pin+"\n\nPor seguridad te recomendamos cambiarlo desde Mi Perfil.");
              }}>
              ¿Olvidaste tu PIN?
            </button>
            <div style={{marginTop:12,textAlign:"center",color:"#9ca3af",fontSize:"0.78rem"}}>
              {participants.length} participante{participants.length!==1?"s":""} registrado{participants.length!==1?"s":""}
            </div>
          </>
        )}

        {isNew && (
          <>
            <div style={S.sectionTitle}>Crear Cuenta</div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:10}}>
              <div>
                <label style={{fontSize:"0.72rem",color:BRAND.red,letterSpacing:1,display:"block",marginBottom:4,fontWeight:700}}>NOMBRE</label>
                <input style={S.input} placeholder="Juan" value={regNombre} onChange={e=>setRegNombre(e.target.value)} />
              </div>
              <div>
                <label style={{fontSize:"0.72rem",color:BRAND.red,letterSpacing:1,display:"block",marginBottom:4,fontWeight:700}}>APELLIDO</label>
                <input style={S.input} placeholder="Perez" value={regApellido} onChange={e=>setRegApellido(e.target.value)} />
              </div>
            </div>
            <div style={{marginBottom:10}}>
              <label style={{fontSize:"0.72rem",color:BRAND.red,letterSpacing:1,display:"block",marginBottom:4,fontWeight:700}}>CORREO ELECTRONICO</label>
              <input style={S.input} type="email" placeholder="tu@correo.com" value={regEmail} onChange={e=>setRegEmail(e.target.value)} />
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:10}}>
              <div>
                <label style={{fontSize:"0.72rem",color:BRAND.red,letterSpacing:1,display:"block",marginBottom:4,fontWeight:700}}>TELEFONO</label>
                <input style={S.input} placeholder="514-000-0000" value={regTel} onChange={e=>setRegTel(e.target.value)} />
              </div>
              <div>
                <label style={{fontSize:"0.72rem",color:BRAND.red,letterSpacing:1,display:"block",marginBottom:4,fontWeight:700}}>SUCURSAL</label>
                <select style={selectStyle} value={regSucursal} onChange={e=>setRegSucursal(e.target.value)}>
                  <option value="">Seleccionar...</option>
                  {SUCURSALES.map(s=><option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:14}}>
              <div>
                <label style={{fontSize:"0.72rem",color:BRAND.red,letterSpacing:1,display:"block",marginBottom:4,fontWeight:700}}>PIN (min. 4 dig.)</label>
                <input style={S.input} type="password" placeholder="****" value={regPin} onChange={e=>setRegPin(e.target.value.replace(/\D/g,""))} />
              </div>
              <div>
                <label style={{fontSize:"0.72rem",color:BRAND.red,letterSpacing:1,display:"block",marginBottom:4,fontWeight:700}}>CONFIRMAR PIN</label>
                <input style={S.input} type="password" placeholder="****" value={regPin2} onChange={e=>setRegPin2(e.target.value.replace(/\D/g,""))} />
              </div>
            </div>
            {error && <div style={{color:"#dc2626",marginBottom:12,fontSize:"0.85rem",background:"#fef2f2",padding:"8px 12px",borderRadius:6}}>{error}</div>}
            <button style={{...S.btn(),width:"100%"}} onClick={handleRegister} disabled={saving}>
              {saving?"Registrando...":"Crear Cuenta y Participar"}
            </button>
          </>
        )}
      </div>
    </div>
  );

  if (step==="done") return (
    <div className="fi" style={{maxWidth:440,margin:"0 auto",textAlign:"center"}}>
      <div style={S.card}>
        <div style={{fontSize:"3rem",marginBottom:10}}>OK</div>
        <div style={{fontSize:"1.2rem",fontWeight:800,color:"#d3172e",marginBottom:8}}>Guardado!</div>
        <div style={{color:"#6b7280",marginBottom:16}}>Hola <strong style={{color:"#111827"}}>{currentUser?.name}</strong></div>
        <div style={{display:"flex",gap:8,justifyContent:"center",flexWrap:"wrap"}}>
          <button style={S.btn()} onClick={()=>setStep("form")}>Editar Pronosticos</button>
          <button style={S.btn("#6b7280",true)} onClick={()=>{setStep("login");try{localStorage.removeItem("sl_user");}catch(e){}setLoginEmail("");setLoginPin("");}}>Cambiar Usuario</button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="fi">
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:14,flexWrap:"wrap",gap:8}}>
        <span style={{color:"#d3172e",fontWeight:800}}>{currentUser?.name}</span>
        <div style={{display:"flex",gap:8}}>
          <button style={{...S.btn("#27ae60"),fontSize:"0.8rem",padding:"6px 14px"}} onClick={handleSave} disabled={saving}>
            {saving?"Guardando...":"Guardar Todo"}
          </button>
          <button style={{...S.btn("#6b7280",true),fontSize:"0.8rem",padding:"6px 12px"}} onClick={()=>{setStep("login");try{localStorage.removeItem("sl_user");}catch(e){}setLoginEmail("");setLoginPin("");}}>Salir</button>
        </div>
      </div>

      <div style={{display:"flex",gap:6,marginBottom:14,flexWrap:"wrap"}}>
        {[["pronosticos","Pronósticos"],["facturas","Mis Facturas"],["perfil","Mi Perfil"]].map(([t,l])=>(
          <button key={t} style={S.navBtn(activeTab===t)} onClick={()=>setActiveTab(t)}>{l}</button>
        ))}
      </div>

      {activeTab==="facturas" && (
        <InvoiceForm currentUser={currentUser} invoices={invoices} setInvoices={setInvoices} />
      )}


      {activeTab==="perfil" && (
        <ProfileTab currentUser={currentUser} setCurrentUser={setCurrentUser} participants={participants} setParticipants={setParticipants} matches={matches} invoices={invoices} preds={preds} />
      )}

      {activeTab==="tablas" && (
        <div className="fi">
          <div style={{padding:"10px 14px",marginBottom:14,background:"#eff6ff",border:"1px solid #bfdbfe",borderRadius:10}}>
            <div style={{fontSize:"0.8rem",color:"#1d4ed8",fontWeight:600}}>Tablas de posiciones con resultados reales</div>
          </div>
          {Object.keys(GROUPS).map(grp => {
            const grpMatches = matches.filter(m=>m.phase==="groups"&&m.group===grp);
            // Build team list from actual match data
            const teamSet = new Set();
            grpMatches.forEach(m=>{if(m.home)teamSet.add(m.home);if(m.away)teamSet.add(m.away);});
            const stats={};
            teamSet.forEach(t=>{stats[t]={team:t,pj:0,g:0,e:0,p:0,gf:0,gc:0,pts:0};});
            grpMatches.forEach(m=>{
              if(m.realHome===null||m.realAway===null) return;
              const h=Number(m.realHome),a=Number(m.realAway);
              if(!stats[m.home]||!stats[m.away]) return;
              stats[m.home].pj++;stats[m.away].pj++;
              stats[m.home].gf+=h;stats[m.home].gc+=a;
              stats[m.away].gf+=a;stats[m.away].gc+=h;
              if(h>a){stats[m.home].g++;stats[m.home].pts+=3;stats[m.away].p++;}
              else if(h<a){stats[m.away].g++;stats[m.away].pts+=3;stats[m.home].p++;}
              else{stats[m.home].e++;stats[m.away].e++;stats[m.home].pts++;stats[m.away].pts++;}
            });
            const table=Object.values(stats).sort((a,b)=>b.pts-a.pts||(b.gf-b.gc)-(a.gf-a.gc)||b.gf-a.gf);
            const hasData=table.some(s=>s.pj>0);
            return <GroupTable key={grp} grp={grp} table={table} hasData={hasData} emptyMsg="Aun no hay resultados para este grupo" />;
          })}
        </div>
      )}

      {activeTab==="pronosticos" && (
        <>
          <div style={{display:"flex",gap:6,marginBottom:14,flexWrap:"wrap"}}>
            {["groups","elim"].map(ph=>(
              <button key={ph} style={S.navBtn(activePhase===ph)} onClick={()=>setActivePhase(ph)}>
                {ph==="groups"?"Grupos":"Playoffs"}
              </button>
            ))}
          </div>

          {activePhase==="groups" && (
            <>
              <div style={{display:"flex",gap:5,flexWrap:"wrap",marginBottom:12}}>
                {Object.keys(GROUPS).map(g=>(
                  <button key={g} style={{
                    ...S.navBtn(activeGroup===g),
                    background:activeGroup===g?GROUP_COLORS[g]:"transparent",
                    borderColor:GROUP_COLORS[g], color:activeGroup===g?"#fff":GROUP_COLORS[g],
                    padding:"4px 10px",fontSize:"0.75rem",
                  }} onClick={()=>setActiveGroup(g)}>Grp {g}</button>
                ))}
              </div>
              {(()=>{const lk=getLockMsg("groups"); return(
                <div style={{background:lk.locked?"#fef2f2":"#f0fdf4",border:"1px solid "+(lk.locked?"#dc262688":"#16a34a66"),borderRadius:7,padding:"7px 12px",marginBottom:10,fontSize:"0.8rem",color:lk.locked?"#e74c3c":"#2ecc71"}}>
                  {lk.locked?"Pronosticos de grupos cerrados":lk.msg}
                </div>
              );})()}
              <div style={S.groupHeader(GROUP_COLORS[activeGroup])}>GRUPO {activeGroup}</div>
              {groupMatches.filter(m=>m.group===activeGroup).map(m=>renderMatchRow(m,isMatchLocked(m,adminUnlocked)))}
              {!isPhaseLocked("groups",adminUnlocked) && (
                <div style={{display:"flex",justifyContent:"flex-end",marginTop:10}}>
                  <button style={{...S.btn("#16a34a"),fontSize:"0.8rem"}} onClick={handleSave} disabled={saving}>
                    {saving?"Guardando...":"Guardar"}
                  </button>
                </div>
              )}
              {(()=>{
                const curMatches=groupMatches.filter(m=>m.group===activeGroup);
                const teamSet=new Set();
                curMatches.forEach(m=>{if(m.home)teamSet.add(m.home);if(m.away)teamSet.add(m.away);});
                const stats={};
                teamSet.forEach(t=>{stats[t]={team:t,pj:0,g:0,e:0,p:0,gf:0,gc:0,pts:0};});
                curMatches.forEach(m=>{
                  const pred=preds[m.id];
                  if(!pred||pred.home===null||pred.away===null) return;
                  const h=Number(pred.home),a=Number(pred.away);
                  if(isNaN(h)||isNaN(a)) return;
                  if(!stats[m.home]||!stats[m.away]) return;
                  stats[m.home].pj++;stats[m.away].pj++;
                  stats[m.home].gf+=h;stats[m.home].gc+=a;
                  stats[m.away].gf+=a;stats[m.away].gc+=h;
                  if(h>a){stats[m.home].g++;stats[m.home].pts+=3;stats[m.away].p++;}
                  else if(h<a){stats[m.away].g++;stats[m.away].pts+=3;stats[m.home].p++;}
                  else{stats[m.home].e++;stats[m.away].e++;stats[m.home].pts++;stats[m.away].pts++;}
                });
                const table=Object.values(stats).sort((a,b)=>b.pts-a.pts||(b.gf-b.gc)-(a.gf-a.gc)||b.gf-a.gf);
                const hasData=table.some(s=>s.pj>0);
                return <GroupTable grp={activeGroup} table={table} hasData={hasData} emptyMsg="Ingresa tus pronosticos para ver la tabla" />;
              })()}
            </>
          )}

          {activePhase==="elim" && (
            <>
              <div style={{display:"flex",gap:5,flexWrap:"wrap",marginBottom:12}}>
                {phases.map(ph=>(
                  <button key={ph} style={{
                    ...S.navBtn(activePh===ph),
                    background:activePh===ph?phaseColors[ph]:"transparent",
                    borderColor:phaseColors[ph]+"88", color:activePh===ph?"#fff":phaseColors[ph],
                    fontSize:"0.75rem",padding:"4px 10px",
                  }} onClick={()=>setActivePh(ph)}>{phaseLabels[ph]}</button>
                ))}
              </div>
              {(()=>{const lk=getLockMsg(activePh); return(
                <div style={{background:lk.locked?"#fef2f2":"#f0fdf4",border:"1px solid "+(lk.locked?"#dc262688":"#16a34a66"),borderRadius:7,padding:"7px 12px",marginBottom:10,fontSize:"0.8rem",color:lk.locked?"#e74c3c":"#2ecc71"}}>
                  {lk.locked?"Cerrado":lk.msg}
                </div>
              );})()}
              {(()=>{const phaseLocked=isPhaseLocked(activePh,adminUnlocked); return(
                <>
                  {elimMatches.filter(m=>m.phase===activePh).map(m=>renderMatchRow(m,phaseLocked))}
                  {!phaseLocked && (
                    <div style={{display:"flex",justifyContent:"flex-end",marginTop:10}}>
                      <button style={{...S.btn("#27ae60"),fontSize:"0.8rem"}} onClick={handleSave} disabled={saving}>
                        {saving?"Guardando...":"Guardar"}
                      </button>
                    </div>
                  )}
                </>
              );})()}
            </>
          )}
        </>
      )}
    </div>
  );
}

// FIXTURE VIEW
function FixtureView({ matches }) {
  const [activeGroup, setActiveGroup] = useState("A");
  const [activePhase, setActivePhase] = useState("groups");
  const phaseColors = {round32:"#0369a1",round16:"#7c3aed",quarters:"#c0392b",semis:"#e67e22",third:"#2980b9",final:"#d3172e"};
  const phaseLabels = {round32:"Ronda 32",round16:"Ronda 16",quarters:"Cuartos de Final",semis:"Semifinales",third:"Tercer Lugar",final:"Gran Final"};
  const groupMatches = matches.filter(m=>m.phase==="groups");
  const elimMatches = matches.filter(m=>m.phase!=="groups");
  const phases = [...new Set(elimMatches.map(m=>m.phase))];

  function renderMatch(m) {
    const hasResult = m.realHome!==null&&m.realAway!==null;
    return (
      <div key={m.id} style={{...S.matchRow,gridTemplateColumns:"1fr auto auto auto 1fr",opacity:(m.home==="Por definir"||m.home?.startsWith("Gan.")||m.home?.startsWith("Per."))?.5:1}}>
        <div style={{textAlign:"right",fontWeight:600,fontSize:"0.85rem"}}>{m.home}</div>
        <div style={{background:hasResult?"#f0fdf4":"#f3f4f6",border:"1px solid "+(hasResult?"#16a34a66":"#d1d5db"),borderRadius:6,padding:"3px 8px",fontSize:"1rem",fontWeight:800,color:hasResult?"#27ae60":"#9ca3af",minWidth:32,textAlign:"center"}}>
          {hasResult?m.realHome:"-"}
        </div>
        <div style={{color:"#9ca3af",fontWeight:700,fontSize:"0.68rem",padding:"0 3px"}}>VS</div>
        <div style={{background:hasResult?"#f0fdf4":"#f3f4f6",border:"1px solid "+(hasResult?"#16a34a66":"#d1d5db"),borderRadius:6,padding:"3px 8px",fontSize:"1rem",fontWeight:800,color:hasResult?"#27ae60":"#9ca3af",minWidth:32,textAlign:"center"}}>
          {hasResult?m.realAway:"-"}
        </div>
        <div style={{textAlign:"left",fontWeight:600,fontSize:"0.85rem"}}>{m.away}</div>
      </div>
    );
  }

  return (
    <div className="fi">
      <div style={{display:"flex",gap:6,marginBottom:14,flexWrap:"wrap"}}>
        {["groups","elim"].map(ph=>(
          <button key={ph} style={S.navBtn(activePhase===ph)} onClick={()=>setActivePhase(ph)}>
            {ph==="groups"?"Grupos":"Playoffs"}
          </button>
        ))}
      </div>
      {activePhase==="groups" && (
        <>
          <div style={{display:"flex",gap:5,flexWrap:"wrap",marginBottom:12}}>
            {Object.keys(GROUPS).map(g=>(
              <button key={g} style={{...S.navBtn(activeGroup===g),background:activeGroup===g?GROUP_COLORS[g]:"transparent",borderColor:GROUP_COLORS[g],color:activeGroup===g?"#fff":GROUP_COLORS[g],padding:"4px 10px",fontSize:"0.75rem"}} onClick={()=>setActiveGroup(g)}>Grp {g}</button>
            ))}
          </div>
          <div style={S.groupHeader(GROUP_COLORS[activeGroup])}>GRUPO {activeGroup}</div>
          {groupMatches.filter(m=>m.group===activeGroup).map(m=>(
            <div key={m.id} style={{display:"flex",alignItems:"center",gap:6,marginBottom:4}}>
              <span style={{color:"#9ca3af",fontSize:"0.72rem",minWidth:38}}>{m.date}</span>
              {renderMatch(m)}
            </div>
          ))}
          {(()=>{
            const grpMatches=groupMatches.filter(m=>m.group===activeGroup);
            const teamSet=new Set();
            grpMatches.forEach(m=>{if(m.home)teamSet.add(m.home);if(m.away)teamSet.add(m.away);});
            const stats={};
            teamSet.forEach(t=>{stats[t]={team:t,pj:0,g:0,e:0,p:0,gf:0,gc:0,pts:0};});
            grpMatches.forEach(m=>{
              if(m.realHome===null||m.realAway===null) return;
              const h=Number(m.realHome),a=Number(m.realAway);
              if(!stats[m.home]||!stats[m.away]) return;
              stats[m.home].pj++;stats[m.away].pj++;
              stats[m.home].gf+=h;stats[m.home].gc+=a;
              stats[m.away].gf+=a;stats[m.away].gc+=h;
              if(h>a){stats[m.home].g++;stats[m.home].pts+=3;stats[m.away].p++;}
              else if(h<a){stats[m.away].g++;stats[m.away].pts+=3;stats[m.home].p++;}
              else{stats[m.home].e++;stats[m.away].e++;stats[m.home].pts++;stats[m.away].pts++;}
            });
            const table=Object.values(stats).sort((a,b)=>b.pts-a.pts||(b.gf-b.gc)-(a.gf-a.gc)||b.gf-a.gf);
            const hasData=table.some(s=>s.pj>0);
            return <GroupTable grp={activeGroup} table={table} hasData={hasData} emptyMsg="Aun no hay resultados para este grupo" />;
          })()}
        </>
      )}
      {activePhase==="elim" && (
        <>
          {phases.map(ph=>(
            <div key={ph}>
              <div style={S.phaseHeader(phaseColors[ph])}>{phaseLabels[ph]}</div>
              {elimMatches.filter(m=>m.phase===ph).map(m=>(
                <div key={m.id} style={{display:"flex",alignItems:"center",gap:6,marginBottom:4}}>
                  <span style={{color:"#9ca3af",fontSize:"0.72rem",minWidth:38}}>{m.date}</span>
                  {renderMatch(m)}
                </div>
              ))}
            </div>
          ))}
        </>
      )}
    </div>
  );
}


// Auto-resolve Round32 team names from group standings
function resolveRound32Teams(matches) {
  // 1. Calculate standings for each group
  const standings = {};
  Object.keys(GROUPS).forEach(grp => {
    const grpMatches = matches.filter(m => m.phase === "groups" && m.group === grp);
    const teamSet = new Set();
    grpMatches.forEach(m => { if(m.home) teamSet.add(m.home); if(m.away) teamSet.add(m.away); });
    const stats = {};
    teamSet.forEach(t => { stats[t] = {team:t, pj:0, g:0, e:0, p:0, gf:0, gc:0, pts:0}; });
    grpMatches.forEach(m => {
      if(m.realHome === null || m.realAway === null) return;
      const h = Number(m.realHome), a = Number(m.realAway);
      if(!stats[m.home] || !stats[m.away]) return;
      stats[m.home].pj++; stats[m.away].pj++;
      stats[m.home].gf += h; stats[m.home].gc += a;
      stats[m.away].gf += a; stats[m.away].gc += h;
      if(h > a){ stats[m.home].g++; stats[m.home].pts += 3; stats[m.away].p++; }
      else if(h < a){ stats[m.away].g++; stats[m.away].pts += 3; stats[m.home].p++; }
      else { stats[m.home].e++; stats[m.away].e++; stats[m.home].pts++; stats[m.away].pts++; }
    });
    standings[grp] = Object.values(stats).sort((a,b) =>
      b.pts - a.pts || (b.gf - b.gc) - (a.gf - a.gc) || b.gf - a.gf
    );
  });

  // Helper: get team by position in group (1-indexed)
  function pos(grp, position) {
    const s = standings[grp];
    if (!s || s.length < position) return null;
    // Only return if the group has played enough matches to determine this position
    if (s[position-1].pj === 0) return null;
    return s[position-1].team;
  }

  // 2. Determine best 3rd place teams
  // Rank all thirds by pts, gd, gf
  const thirds = Object.keys(GROUPS).map(grp => {
    const s = standings[grp];
    if (!s || s.length < 3 || s[2].pj === 0) return null;
    return { grp, ...s[2] };
  }).filter(Boolean).sort((a,b) =>
    b.pts - a.pts || (b.gf - b.gc) - (a.gf - a.gc) || b.gf - a.gf
  );

  // Best 8 thirds (FIFA 2026 has 32 teams in round of 32, 8 thirds qualify)
  const best8thirds = thirds.slice(0, 8);

  // Helper: find best 3rd from specific groups
  function best3rd(groupList) {
    const groups = groupList.split("/");
    const candidates = best8thirds.filter(t => groups.includes(t.grp));
    return candidates.length > 0 ? candidates[0].team : null;
  }

  // 3. Map round32 placeholders to real team names
  // Only update if we have the data, otherwise keep placeholder
  const round32Map = {
    // Match 1001: 2º A vs 2º B
    1001: { home: pos("A",2), away: pos("B",2) },
    // Match 1002: 1º E vs 3º A/B/C/D/F
    1002: { home: pos("E",1), away: best3rd("A/B/C/D/F") },
    // Match 1003: 1º F vs 2º C
    1003: { home: pos("F",1), away: pos("C",2) },
    // Match 1004: 1º C vs 2º F
    1004: { home: pos("C",1), away: pos("F",2) },
    // Match 1005: 1º I vs 3º C/D/F/G/H
    1005: { home: pos("I",1), away: best3rd("C/D/F/G/H") },
    // Match 1006: 2º E vs 2º I
    1006: { home: pos("E",2), away: pos("I",2) },
    // Match 1007: 1º A vs 3º C/E/F/H/I
    1007: { home: pos("A",1), away: best3rd("C/E/F/H/I") },
    // Match 1008: 1º L vs 3º E/H/I/J/K
    1008: { home: pos("L",1), away: best3rd("E/H/I/J/K") },
    // Match 1009: 1º D vs 3º B/E/F/I/J
    1009: { home: pos("D",1), away: best3rd("B/E/F/I/J") },
    // Match 1010: 1º G vs 3º A/E/H/I/J
    1010: { home: pos("G",1), away: best3rd("A/E/H/I/J") },
    // Match 1011: 2º K vs 2º L
    1011: { home: pos("K",2), away: pos("L",2) },
    // Match 1012: 1º H vs 2º J
    1012: { home: pos("H",1), away: pos("J",2) },
    // Match 1013: 1º B vs 3º E/F/G/I/J
    1013: { home: pos("B",1), away: best3rd("E/F/G/I/J") },
    // Match 1014: 1º J vs 2º H
    1014: { home: pos("J",1), away: pos("H",2) },
    // Match 1015: 1º K vs 3º D/E/I/J/L
    1015: { home: pos("K",1), away: best3rd("D/E/I/J/L") },
    // Match 1016: 2º D vs 2º G
    1016: { home: pos("D",2), away: pos("G",2) },
  };

  // 4. Apply updates to matches
  return matches.map(m => {
    if (m.phase !== "round32") return m;
    const update = round32Map[m.id];
    if (!update) return m;
    return {
      ...m,
      home: update.home || m.home,
      away: update.away || m.away,
    };
  });
}


function AdminParticipantRow({ p, i, participants, setParticipants, invoices, matches, removeParticipant }) {
  const [editing, setEditing] = useState(false);
  const [eNombre, setENombre] = useState(p.nombre||p.name||"");
  const [eApellido, setEApellido] = useState(p.apellido||"");
  const [eTel, setETel] = useState(p.telefono||"");
  const [ePin, setEPin] = useState("");

  async function saveEdit() {
    const updated = {...p, nombre:eNombre.trim(), apellido:eApellido.trim(), name:eNombre.trim()+" "+eApellido.trim(), telefono:eTel.trim(), ...(ePin.length>=6?{pin:ePin}:{})};
    const newList = [...participants.filter(x=>x.id!==p.id), updated];
    await setDoc(PARTICIPANTS_DOC, {list: newList});
    setParticipants(newList);
    setEditing(false);
  }

  return (
    <div style={{...S.leaderRow(i), flexDirection:"column", alignItems:"stretch", gap:6}}>
      <div style={{display:"flex", justifyContent:"space-between", alignItems:"center"}}>
        <div style={{display:"flex", alignItems:"center", gap:10}}>
          <span style={{color:"#9ca3af", fontWeight:700, minWidth:24}}>#{i+1}</span>
          <div>
            <div style={{fontWeight:700, color:BRAND.gray900}}>{p.name}</div>
            <div style={{fontSize:"0.72rem", color:"#9ca3af"}}>
              {p.email && <span>{p.email} &nbsp;|&nbsp; </span>}
              {p.sucursal && <span style={{color:BRAND.red, fontWeight:600}}>{p.sucursal} &nbsp;|&nbsp; </span>}
              {Object.keys(p.predictions||{}).length} pronosticos &nbsp;|&nbsp; {p._totalInv} facturas
              {p._invPts>0 && <span style={{color:BRAND.red}}> | +{p._invPts}pts</span>}
              {p._classPts>0 && <span style={{color:"#7c3aed"}}> | +{p._classPts}pts</span>}
            </div>
          </div>
        </div>
        <div style={{display:"flex", alignItems:"center", gap:6}}>
          <div style={{textAlign:"right"}}>
            <div style={{fontSize:"1.3rem", fontWeight:800, color:BRAND.red}}>{p._total}</div>
            <div style={{fontSize:"0.68rem", color:"#9ca3af"}}>pts</div>
          </div>
          <button onClick={()=>setEditing(e=>!e)}
            style={{background:editing?"#f3f4f6":"transparent", border:"1px solid #2563eb44", color:"#2563eb", borderRadius:6, padding:"3px 8px", cursor:"pointer", fontSize:"0.78rem"}}>
            ✏️
          </button>
          <button onClick={()=>removeParticipant(p.id)}
            style={{background:"transparent", border:"1px solid #dc262644", color:"#dc2626", borderRadius:6, padding:"3px 8px", cursor:"pointer", fontSize:"0.78rem"}}>
            X
          </button>
        </div>
      </div>
      {editing && (
        <div style={{background:"#f9fafb", borderRadius:8, padding:"10px 12px", display:"flex", flexWrap:"wrap", gap:8, alignItems:"flex-end"}}>
          {[["Nombre",eNombre,setENombre],["Apellido",eApellido,setEApellido],["Teléfono",eTel,setETel]].map(([l,v,sv])=>(
            <div key={l} style={{flex:"1 1 120px"}}>
              <label style={{fontSize:"0.7rem", color:"#6b7280", display:"block", marginBottom:3}}>{l}</label>
              <input style={{...S.input, padding:"5px 8px", fontSize:"0.82rem"}} value={v} onChange={e=>sv(e.target.value)} />
            </div>
          ))}
          <div style={{flex:"1 1 120px"}}>
            <label style={{fontSize:"0.7rem", color:"#6b7280", display:"block", marginBottom:3}}>Nuevo PIN</label>
            <input style={{...S.input, padding:"5px 8px", fontSize:"0.82rem"}} type="password" placeholder="min 6 dígitos" value={ePin} onChange={e=>setEPin(e.target.value)} />
          </div>
          <button style={{...S.btn(), padding:"6px 14px", fontSize:"0.82rem"}} onClick={saveEdit}>Guardar</button>
          <button style={{...S.btn("#6b7280",true), padding:"6px 10px", fontSize:"0.82rem"}} onClick={()=>setEditing(false)}>✕</button>
        </div>
      )}
    </div>
  );
}

// ADMIN PANEL
function AdminPanel({ matches, setMatches, participants, setParticipants, adminUnlocked, setAdminUnlocked, invoices, setInvoices }) {
  const [authed, setAuthed] = useState(false);
  const [pinInput, setPinInput] = useState("");
  const [activeGroup, setActiveGroup] = useState("A");
  const [activePhase, setActivePhase] = useState("groups");
  const [activePh, setActivePh] = useState("round32");
  const [saved, setSaved] = useState(false);
  const [activeTab, setActiveTab] = useState("results");
  const ADMIN = "2026";

  const phaseColors = {round32:"#0369a1",round16:"#7c3aed",quarters:"#c0392b",semis:"#e67e22",third:"#2980b9",final:"#d3172e"};
  const phaseLabels = {round32:"Ronda 32",round16:"Ronda 16",quarters:"Cuartos de Final",semis:"Semifinales",third:"Tercer Lugar",final:"Gran Final"};
  const groupMatches = matches.filter(m=>m.phase==="groups");
  const elimMatches = matches.filter(m=>m.phase!=="groups");
  const phases = [...new Set(elimMatches.map(m=>m.phase))];
  const pendingInvoices = invoices.filter(inv=>inv.status==="pending");

  function setResult(matchId, side, val) {
    const v = val===""?null:Math.max(0,parseInt(val)||0);
    setMatches(prev=>prev.map(m=>m.id===matchId?{...m,[side==="home"?"realHome":"realAway"]:v}:m));
  }

  function setTeamName(matchId, side, val) {
    setMatches(prev=>prev.map(m=>m.id===matchId?{...m,[side==="home"?"home":"away"]:val}:m));
  }

  async function handleSave() {
    try {
      // Auto-fill Round32 teams from group standings before saving
      const resolved = resolveRound32Teams(matches);
      setMatches(resolved);
      await setDoc(MATCHES_DOC, {list: resolved});
      setSaved(true);
      setTimeout(()=>setSaved(false),2000);
    } catch(e) { alert("Error: "+e.message); }
  }

  async function toggleUnlock(phase) {
    const updated = {...adminUnlocked, [phase]:!adminUnlocked[phase]};
    setAdminUnlocked(updated);
    await setDoc(SETTINGS_DOC, {adminUnlocked: updated});
  }

  async function handleInvoice(invoiceId, action) {
    const updated = invoices.map(inv=>
      inv.id===invoiceId ? {...inv, status:action, reviewedAt:new Date().toISOString()} : inv
    );
    await setDoc(INVOICES_DOC, {list: updated});
    setInvoices(updated);
  }

  function removeParticipant(id) {
    if (!window.confirm("Eliminar este participante?")) return;
    const updated = participants.filter(p=>p.id!==id);
    setParticipants(updated);
    setDoc(PARTICIPANTS_DOC, {list: updated});
  }

  if (!authed) return (
    <div style={{maxWidth:360,margin:"0 auto"}}>
      <div style={S.card}>
        <div style={S.sectionTitle}>Panel de Administrador</div>
        <input style={{...S.input,marginBottom:14}} type="password" placeholder="PIN administrador"
          value={pinInput} onChange={e=>setPinInput(e.target.value)}
          onKeyDown={e=>e.key==="Enter"&&(pinInput===ADMIN?setAuthed(true):alert("PIN incorrecto"))} />
        <button style={S.btn()} onClick={()=>pinInput===ADMIN?setAuthed(true):alert("PIN incorrecto")}>
          Entrar como Admin
        </button>
      </div>
    </div>
  );

  return (
    <div className="fi">
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:14,flexWrap:"wrap",gap:8}}>
        <div style={{display:"flex",gap:5,flexWrap:"wrap"}}>
          {[["results","Resultados"],["invoices","Facturas"+(pendingInvoices.length>0?" ("+pendingInvoices.length+")":"")],["teams","Equipos"],["locks","Bloqueos"],["users","Participantes"]].map(([t,l])=>(
            <button key={t} style={{...S.navBtn(activeTab===t),background:t==="invoices"&&pendingInvoices.length>0&&activeTab!==t?"#e67e2222":undefined}} onClick={()=>setActiveTab(t)}>{l}</button>
          ))}
        </div>
        <button style={{...S.btn(saved?"#27ae60":"#d3172e"),fontSize:"0.8rem"}} onClick={handleSave}>
          {saved?"Guardado!":"Guardar Resultados"}
        </button>
      </div>

      {activeTab==="invoices" && (
        <div>
          <div style={S.sectionTitle}>Facturas Pendientes de Aprobacion</div>
          {pendingInvoices.length===0 && (
            <div style={{color:"#9ca3af",padding:20,textAlign:"center"}}>No hay facturas pendientes</div>
          )}
          {invoices.map(inv=>(
            <div key={inv.id} style={S.invoiceCard(inv.status)}>
              <div style={{flex:1}}>
                <div style={{fontWeight:700,fontSize:"0.9rem"}}>{inv.participantName}</div>
                <div style={{color:"#6b7280",fontSize:"0.78rem",marginTop:2}}>
                  Factura: <strong style={{color:"#111827"}}>{inv.invoiceNum}</strong>
                  &nbsp;|&nbsp; Monto: <strong style={{color:"#d3172e"}}>${inv.amount} CAD</strong>
                  &nbsp;|&nbsp; Pts: <strong style={{color:"#16a34a"}}>{inv.points}</strong>
                </div>
                <div style={{fontSize:"0.72rem",color:"#9ca3af",marginTop:2}}>
                  {new Date(inv.createdAt).toLocaleDateString()}
                </div>
              </div>
              <div style={{display:"flex",gap:6,alignItems:"center",flexWrap:"wrap"}}>
                <div style={S.statusBadge(inv.status)}>
                  {inv.status==="approved"?"Aprobada":inv.status==="rejected"?"Rechazada":"Pendiente"}
                </div>
                {inv.status==="pending" && (
                  <>
                    <button style={{...S.btn("#27ae60"),fontSize:"0.78rem",padding:"5px 12px"}}
                      onClick={()=>handleInvoice(inv.id,"approved")}>Aprobar</button>
                    <button style={{...S.btn("#c0392b",true),fontSize:"0.78rem",padding:"5px 12px"}}
                      onClick={()=>handleInvoice(inv.id,"rejected")}>Rechazar</button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {activeTab==="results" && (
        <>
          <div style={{display:"flex",gap:6,marginBottom:12,flexWrap:"wrap"}}>
            {["groups","elim"].map(ph=>(
              <button key={ph} style={S.navBtn(activePhase===ph)} onClick={()=>setActivePhase(ph)}>
                {ph==="groups"?"Grupos":"Playoffs"}
              </button>
            ))}
          </div>
          {activePhase==="groups" && (
            <>
              <div style={{display:"flex",gap:5,flexWrap:"wrap",marginBottom:12}}>
                {Object.keys(GROUPS).map(g=>(
                  <button key={g} style={{...S.navBtn(activeGroup===g),background:activeGroup===g?GROUP_COLORS[g]:"transparent",borderColor:GROUP_COLORS[g],color:activeGroup===g?"#fff":GROUP_COLORS[g],padding:"4px 10px",fontSize:"0.75rem"}} onClick={()=>setActiveGroup(g)}>Grp {g}</button>
                ))}
              </div>
              <div style={S.groupHeader(GROUP_COLORS[activeGroup])}>GRUPO {activeGroup}</div>
              {groupMatches.filter(m=>m.group===activeGroup).map(m=>(
                <div key={m.id} style={{display:"grid",gridTemplateColumns:"38px 1fr 46px 12px 46px 1fr 24px",gap:5,alignItems:"center",background:"#f9fafb",border:"1px solid #1e2d4a",borderRadius:8,padding:"6px 10px",marginBottom:5}}>
                  <span style={{color:"#9ca3af",fontSize:"0.7rem"}}>{m.date}</span>
                  <div style={{textAlign:"right",fontWeight:600,fontSize:"0.82rem"}}>{m.home}</div>
                  <input type="number" min="0" max="99" placeholder="-" style={S.scoreInput}
                    value={m.realHome??""} onChange={e=>setResult(m.id,"home",e.target.value)} />
                  <span style={{color:"#9ca3af",fontSize:"0.68rem",textAlign:"center"}}>VS</span>
                  <input type="number" min="0" max="99" placeholder="-" style={S.scoreInput}
                    value={m.realAway??""} onChange={e=>setResult(m.id,"away",e.target.value)} />
                  <div style={{fontWeight:600,fontSize:"0.82rem"}}>{m.away}</div>
                  <span style={{fontSize:"0.8rem",color:m.realHome!==null?"#27ae60":"#9ca3af"}}>
                    {m.realHome!==null?"OK":"..."}
                  </span>
                </div>
              ))}
            </>
          )}
          {activePhase==="elim" && (
            <>
              <div style={{display:"flex",gap:5,flexWrap:"wrap",marginBottom:12}}>
                {phases.map(ph=>(
                  <button key={ph} style={{...S.navBtn(activePh===ph),background:activePh===ph?phaseColors[ph]:"transparent",borderColor:phaseColors[ph]+"88",color:activePh===ph?"#fff":phaseColors[ph],fontSize:"0.75rem",padding:"4px 10px"}} onClick={()=>setActivePh(ph)}>{phaseLabels[ph]}</button>
                ))}
              </div>
              <div style={S.phaseHeader(phaseColors[activePh])}>{phaseLabels[activePh]}</div>
              {elimMatches.filter(m=>m.phase===activePh).map(m=>(
                <div key={m.id} style={{display:"grid",gridTemplateColumns:"38px 1fr 46px 12px 46px 1fr 24px",gap:5,alignItems:"center",background:"#f9fafb",border:"1px solid #1e2d4a",borderRadius:8,padding:"6px 10px",marginBottom:5}}>
                  <span style={{color:"#9ca3af",fontSize:"0.7rem"}}>{m.date}</span>
                  <div style={{textAlign:"right",fontWeight:600,fontSize:"0.82rem",color:"#6b7280"}}>{m.home}</div>
                  <input type="number" min="0" max="99" placeholder="-" style={S.scoreInput}
                    value={m.realHome??""} onChange={e=>setResult(m.id,"home",e.target.value)} />
                  <span style={{color:"#9ca3af",fontSize:"0.68rem",textAlign:"center"}}>VS</span>
                  <input type="number" min="0" max="99" placeholder="-" style={S.scoreInput}
                    value={m.realAway??""} onChange={e=>setResult(m.id,"away",e.target.value)} />
                  <div style={{fontWeight:600,fontSize:"0.82rem",color:"#6b7280"}}>{m.away}</div>
                  <span style={{fontSize:"0.8rem",color:m.realHome!==null?"#27ae60":"#9ca3af"}}>
                    {m.realHome!==null?"OK":"..."}
                  </span>
                </div>
              ))}
            </>
          )}
        </>
      )}

      {activeTab==="teams" && (
        <div>
          <p style={{color:"#6b7280",marginBottom:14,fontSize:"0.85rem"}}>Actualiza los equipos eliminatorias.</p>
          {phases.map(ph=>(
            <div key={ph}>
              <div style={S.phaseHeader(phaseColors[ph])}>{phaseLabels[ph]}</div>
              {elimMatches.filter(m=>m.phase===ph).map((m)=>(
                <div key={m.id} style={{display:"grid",gridTemplateColumns:"1fr 30px 1fr",gap:6,alignItems:"center",marginBottom:7}}>
                  <input style={{...S.input,textAlign:"right",marginBottom:0}} value={m.home}
                    onChange={e=>setTeamName(m.id,"home",e.target.value)} />
                  <div style={{textAlign:"center",color:"#9ca3af",fontWeight:700}}>VS</div>
                  <input style={{...S.input,marginBottom:0}} value={m.away}
                    onChange={e=>setTeamName(m.id,"away",e.target.value)} />
                </div>
              ))}
            </div>
          ))}
          <button style={{...S.btn(),marginTop:14}} onClick={handleSave}>Guardar Equipos</button>
        </div>
      )}

      {activeTab==="locks" && (
        <div>
          <p style={{color:"#6b7280",marginBottom:14,fontSize:"0.85rem"}}>Bloquea o desbloquea manualmente cada fase para pruebas o correcciones.</p>
          {[
            {phase:"groups",label:"Grupos",lockDate:"11 Jun 2026",color:"#1F618D"},
            {phase:"round32",label:"Ronda de 32",lockDate:"28 Jun 2026",color:"#0369a1"},
            {phase:"round16",label:"Ronda de 16",lockDate:"4 Jul 2026",color:"#7c3aed"},
            {phase:"quarters",label:"Cuartos de Final",lockDate:"9 Jul 2026",color:"#c0392b"},
            {phase:"semis",label:"Semifinales",lockDate:"14 Jul 2026",color:"#e67e22"},
            {phase:"third",label:"Tercer Lugar",lockDate:"18 Jul 2026",color:"#2980b9"},
            {phase:"final",label:"Gran Final",lockDate:"19 Jul 2026",color:"#d3172e"},
          ].map(({phase,label,lockDate,color})=>{
            const manLocked=!!adminUnlocked[phase+"_forced"];
            const autoLocked=isPhaseLocked(phase,{});
            const manUnlocked=!!adminUnlocked[phase];
            const isLocked = manLocked || (autoLocked && !manUnlocked);
            return (
              <div key={phase} style={{display:"flex",alignItems:"center",justifyContent:"space-between",background:"#f9fafb",border:"1px solid "+color+"44",borderRadius:10,padding:"12px 16px",marginBottom:8,flexWrap:"wrap",gap:8}}>
                <div>
                  <div style={{fontWeight:700,fontSize:"0.95rem",color:"#111827"}}>{label}</div>
                  <div style={{fontSize:"0.75rem",color:"#9ca3af",marginTop:2}}>Bloqueo automatico: {lockDate}</div>
                  <div style={{fontSize:"0.8rem",marginTop:3,fontWeight:600,color:isLocked?"#e74c3c":"#16a34a"}}>
                    {isLocked ? "🔒 BLOQUEADO" : "🔓 ABIERTO"}
                  </div>
                </div>
                <div style={{display:"flex",gap:6}}>
                  <button
                    style={{...S.btn(isLocked?"#16a34a":"#e74c3c",true),fontSize:"0.78rem",padding:"6px 14px"}}
                    onClick={async ()=>{
                      let updated;
                      if (isLocked) {
                        // Unlock: set manUnlocked=true, remove forced lock
                        updated = {...adminUnlocked, [phase]:true, [phase+"_forced"]:false};
                      } else {
                        // Lock: set forced lock, remove manual unlock
                        updated = {...adminUnlocked, [phase]:false, [phase+"_forced"]:true};
                      }
                      setAdminUnlocked(updated);
                      await setDoc(SETTINGS_DOC, {adminUnlocked: updated});
                    }}>
                    {isLocked ? "Desbloquear" : "Bloquear"}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {activeTab==="users" && (
        <div>
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:14,flexWrap:"wrap",gap:8}}>
            <div style={{...S.sectionTitle,marginBottom:0,borderBottom:"none"}}>{participants.length} Participantes</div>
            <button style={{...S.btn("#16a34a"),fontSize:"0.8rem",padding:"7px 14px"}} onClick={()=>{
              const ranked = [...participants].map(p=>{
                const userInv=(invoices||[]).filter(inv=>inv.participantId===p.id&&inv.status==="approved");
                const invPts=userInv.reduce((sum,inv)=>sum+calcInvoicePoints(inv.amount),0);
                let gamePts=0;
                matches.forEach(m=>{const pred=p.predictions?.[m.id];if(!pred)return;const pts=calcPoints(pred.home,pred.away,m.realHome,m.realAway);if(pts!==null)gamePts+=pts;});
                const {bonus:classPts}=calcClassificationBonus(p.predictions,matches);
                return {...p,_total:gamePts+invPts+classPts,_invPts:invPts,_classPts:classPts};
              }).sort((a,b)=>b._total-a._total);
              const headers = ["Posicion","Nombre","Apellido","Correo","Telefono","Sucursal","Puntos Pronosticos","Puntos Clasificados","Puntos Facturas","Total Puntos","Facturas Registradas","Fecha Registro"];
              const rows = ranked.map((p,i)=>[
                i+1,
                p.nombre||p.name||"",
                p.apellido||"",
                p.email||"",
                p.telefono||"",
                p.sucursal||"",
                p._total-p._invPts-p._classPts,
                p._classPts||0,
                p._invPts,
                p._total,
                (invoices||[]).filter(inv=>inv.participantId===p.id).length,
                p.createdAt?new Date(p.createdAt).toLocaleDateString():"",
              ]);
              const csv = [headers,...rows].map(r=>r.map(v=>'"'+String(v).replace(/"/g,'""')+'"').join(",")).join("\n");
              const blob = new Blob(["\uFEFF"+csv],{type:"text/csv;charset=utf-8;"});
              const url = URL.createObjectURL(blob);
              const a = document.createElement("a");
              a.href=url; a.download="participantes-mundial2026.csv"; a.click();
              URL.revokeObjectURL(url);
            }}>
              Exportar a Excel (CSV)
            </button>
          </div>
          {participants.length===0 && <div style={{color:"#9ca3af",padding:16}}>Sin participantes</div>}
          {[...participants].map(p=>{
            const userInv=(invoices||[]).filter(inv=>inv.participantId===p.id&&inv.status==="approved");
            const invPts=userInv.reduce((sum,inv)=>sum+calcInvoicePoints(inv.amount),0);
            const totalInv=(invoices||[]).filter(inv=>inv.participantId===p.id).length;
            let gamePts=0,exact=0,correct=0;
            matches.forEach(m=>{const pred=p.predictions?.[m.id];if(!pred)return;const pts=calcPoints(pred.home,pred.away,m.realHome,m.realAway);if(pts===null)return;gamePts+=pts;if(pts===5)exact++;if(pts>=3)correct++;});
            const {bonus:classPts}=calcClassificationBonus(p.predictions,matches);
            return {...p,_total:gamePts+invPts+classPts,_invPts:invPts,_classPts:classPts,_exact:exact,_correct:correct,_totalInv:totalInv};
          }).sort((a,b)=>b._total-a._total).map((p,i)=>(
            <AdminParticipantRow key={p.id} p={p} i={i} participants={participants} setParticipants={setParticipants} invoices={invoices} matches={matches} removeParticipant={removeParticipant} />
          ))}
        </div>
      )}
    </div>
  );
}

// MAIN APP
export default function App() {
  const isAdmin = typeof window !== "undefined" && window.location.search.includes("admin");
  const [view, setView] = useState("leaderboard");
  const [matches, setMatches] = useState(INITIAL_MATCHES);
  const [participants, setParticipants] = useState([]);
  const [adminUnlocked, setAdminUnlocked] = useState({});
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  // Global session - survives tab navigation
  const [currentUser, setCurrentUser] = useState(() => {
    try { const s=localStorage.getItem("sl_user"); return s?JSON.parse(s):null; } catch(e){return null;}
  });

  useEffect(() => {
    const unsubP = onSnapshot(PARTICIPANTS_DOC, snap => {
      if (snap.exists()) setParticipants(snap.data().list || []);
    });
    const unsubM = onSnapshot(MATCHES_DOC, snap => {
      if (snap.exists()) {
        const saved = snap.data().list || [];
        // Merge: keep new match structure but restore saved results & team names for elim
        const merged = INITIAL_MATCHES.map(m => {
          const old = saved.find(s => s.id === m.id);
          if (!old) return m;
          if (m.phase === "groups") {
            // Groups: keep new team names, only restore real results
            return {...m, realHome: old.realHome, realAway: old.realAway};
          } else {
            // Playoffs: restore team names + results (admin edits them)
            return {...m, home: old.home||m.home, away: old.away||m.away, realHome: old.realHome, realAway: old.realAway};
          }
        });
        setMatches(merged);
      } else {
        setMatches(INITIAL_MATCHES);
      }
    });
    const unsubS = onSnapshot(SETTINGS_DOC, snap => {
      if (snap.exists()) setAdminUnlocked(snap.data().adminUnlocked || {});
    });
    const unsubI = onSnapshot(INVOICES_DOC, snap => {
      if (snap.exists()) setInvoices(snap.data().list || []);
      setLoading(false);
    });
    setTimeout(() => setLoading(false), 3000);
    return () => { unsubP(); unsubM(); unsubS(); unsubI(); };
  }, []);

  const tabs = [
    {id:"leaderboard", label:"Clasificacion"},
    {id:"predictions", label:"Inicio"},
    {id:"fixture", label:"Resultados"},
    ...(isAdmin ? [{id:"admin", label:"Admin"}] : []),
  ];

  const totalMatches = matches.filter(m=>m.realHome!==null).length;
  const pendingInv = invoices.filter(i=>i.status==="pending").length;

  if (loading) return (
    <div style={{...S.app,display:"flex",alignItems:"center",justifyContent:"center",minHeight:"100vh"}}>
      <FontStyle />
      <div style={{textAlign:"center"}}>
        <img src="data:image/jpeg;base64"
          alt="Sabor Latino" style={{height:60,marginBottom:16,opacity:.8}} />
        <div style={{fontSize:"2rem",marginBottom:8,color:BRAND.red}} className="pulse">...</div>
        <div style={{color:BRAND.gray400,fontSize:"0.85rem",letterSpacing:3}}>CARGANDO...</div>
      </div>
    </div>
  );

  return (
    <div style={S.app}>
      <FontStyle />
      <header style={S.header}>
        <div style={S.headerInner}>
          <div style={S.logo}>
            <img
              src="data:image/jpeg;base64"
              alt="Sabor Latino"
              style={{height:44, width:"auto", objectFit:"contain", borderRadius:4}}
              onError={e=>{e.target.style.display="none";}}
            />
            <div>
              <div style={{fontSize:"0.65rem",color:BRAND.red,fontWeight:800,letterSpacing:2,textTransform:"uppercase"}}>Concurso</div>
              <div style={{fontSize:"1rem",fontWeight:800,color:BRAND.gray900,letterSpacing:1}}>Mundial 2026</div>
            </div>
          </div>
          <nav style={{...S.nav, alignItems:"center"}}>
            {tabs.map(t=>(
              <button key={t.id} style={S.navBtn(view===t.id)} onClick={()=>setView(t.id)}>
                {t.label}
                {t.id==="admin"&&pendingInv>0 && (
                  <span style={{background:BRAND.red,color:"#fff",borderRadius:"50%",padding:"1px 6px",fontSize:"0.7rem",marginLeft:5}}>{pendingInv}</span>
                )}
              </button>
            ))}
            {!currentUser ? (
              <button
                title="Iniciar Sesion"
                onClick={()=>setView("login")}
                style={{background:"none",border:"none",cursor:"pointer",padding:"6px 8px",display:"flex",alignItems:"center",color:view==="login"?BRAND.red:"#6b7280",borderRadius:6,transition:"color 0.15s",marginLeft:2}}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="8" r="4"/>
                  <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/>
                </svg>
              </button>
            ) : (
              <button
                title={currentUser.name}
                onClick={()=>setView("login")}
                style={{background:(view==="login"||view==="predictions")?BRAND.red:"#e5e7eb",border:"none",cursor:"pointer",borderRadius:"50%",width:32,height:32,display:"flex",alignItems:"center",justifyContent:"center",fontWeight:800,fontSize:"0.85rem",color:(view==="login"||view==="predictions")?"#fff":BRAND.gray900,marginLeft:4,transition:"background 0.15s"}}
              >
                {(currentUser.nombre||currentUser.name||"?")[0].toUpperCase()}
              </button>
            )}
          </nav>
        </div>
        <div style={{background:BRAND.red,padding:"4px 16px",textAlign:"center",fontSize:"0.7rem",color:"rgba(255,255,255,0.85)",letterSpacing:1}}>
          {participants.length} PARTICIPANTES &nbsp;|&nbsp; {totalMatches} PARTIDOS &nbsp;|&nbsp; 11 JUN - 19 JUL 2026
        </div>
      </header>

      <main style={S.main}>
        {view==="leaderboard" && <Leaderboard participants={participants} matches={matches} invoices={invoices} />}
        {(view==="predictions"||view==="login") && <ParticipantForm participants={participants} setParticipants={setParticipants} matches={matches} adminUnlocked={adminUnlocked} invoices={invoices} setInvoices={setInvoices} currentUser={currentUser} setCurrentUser={setCurrentUser} initialStep={view==="login"?"login":undefined} />}
        {view==="fixture" && <FixtureView matches={matches} />}
        {view==="admin" && <AdminPanel matches={matches} setMatches={setMatches} participants={participants} setParticipants={setParticipants} adminUnlocked={adminUnlocked} setAdminUnlocked={setAdminUnlocked} invoices={invoices} setInvoices={setInvoices} />}
      </main>
    </div>
  );
}
