import { createFileRoute, Link, useNavigate, Navigate } from "@tanstack/react-router";
import { type CSSProperties, useEffect, useState } from "react";
import { SiteHeader } from "@/components/SiteHeader";
import { useAuth } from "@/hooks/useAuth";
import { useUiLang } from "@/hooks/useUiLang";
import { COURSES } from "@/lib/ib-courses";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ChevronLeft, Lock } from "lucide-react";
import {
  LANDING_FONT_LINK,
  LANDING as L,
  CRIT,
  cardShadow,
  landingFontMono as fontMono,
  landingFontSans as fontSans,
} from "@/lib/landing-theme";

export const Route = createFileRoute("/teoria")({
  head: () => ({
    meta: [
      { title: "Theory — LIBerico" },
      { name: "description", content: "Literary theory for IB Language A Paper 1." },
    ],
    links: [{ rel: "stylesheet", href: LANDING_FONT_LINK }],
  }),
  component: TeoriaPage,
});

type CSSVarStyle = CSSProperties & Record<`--${string}`, string>;

const headingStyle = { ...fontSans, letterSpacing: "-0.02em" } as const;

const ctaPrimary = {
  backgroundColor: L.primary,
  color: "#fff",
  boxShadow: "0 16px 30px -12px rgba(79,70,229,0.55)",
} as const;

const cardStyle = {
  backgroundColor: L.surface,
  borderColor: L.line,
  boxShadow: cardShadow,
} as const;

const softCardStyle = {
  backgroundColor: L.bg2,
  borderColor: L.line,
} as const;

const teoriaRootStyle: CSSVarStyle = {
  ...fontSans,
  backgroundColor: L.bg,
  color: L.ink,
  "--background": L.bg,
  "--foreground": L.ink,
  "--ink": L.ink,
  "--card": L.surface,
  "--card-foreground": L.ink,
  "--popover": L.surface,
  "--popover-foreground": L.ink,
  "--primary": L.primary,
  "--primary-foreground": "#FFFFFF",
  "--secondary": L.bg2,
  "--secondary-foreground": L.ink,
  "--muted": L.bg2,
  "--muted-foreground": L.muted,
  "--accent": L.primary + "10",
  "--accent-foreground": L.ink,
  "--border": L.line,
  "--input": L.line,
  "--ring": L.primary,
};

function TeoriaScopedStyles() {
  return (
    <style>{`
      #teoria-root .lib-press{transition:transform 0.14s cubic-bezier(0.23,1,0.32,1),border-color 0.18s ease,background-color 0.18s ease,box-shadow 0.18s ease;}
      #teoria-root .lib-press:active{transform:scale(0.98);}
      #teoria-root .lib-reveal{animation:teoriaReveal 0.45s cubic-bezier(0.22,1,0.36,1) both;}
      #teoria-root a:focus-visible,#teoria-root button:focus-visible,#teoria-root [role="button"]:focus-visible{outline:2px solid ${L.primary};outline-offset:3px;border-radius:14px;}
      #teoria-root button:not([disabled]){cursor:pointer;}
      #teoria-root .theory-elevated-card{background:${L.surface};border-color:${L.line};box-shadow:${cardShadow};}
      #teoria-root .theory-soft-card{background:${L.bg2};border-color:${L.line};}
      #teoria-root .theory-content-card p{color:${L.ink};}
      #teoria-root .theory-content-card .text-muted-foreground{color:${L.muted};}
      #teoria-root .theory-content-card .text-primary{color:${L.primary};}
      @media (hover:hover) and (pointer:fine){
        #teoria-root .theory-hover-card:hover{transform:translateY(-2px);box-shadow:0 20px 36px -24px rgba(15,23,42,0.36),0 4px 10px -6px rgba(15,23,42,0.12);}
      }
      @media (prefers-reduced-motion: reduce){
        #teoria-root .lib-reveal{animation:none !important;}
        #teoria-root .lib-press,#teoria-root .theory-hover-card{transition:none !important;}
      }
      @keyframes teoriaReveal{from{opacity:0;transform:translateY(10px);}to{opacity:1;transform:none;}}
    `}</style>
  );
}

// ── TIPOS ────────────────────────────────────────────────────

type Seccion = {
  id: string;
  titulo: string;
  tituloEN: string;
  descripcion: string;
  descripcionEN: string;
  tag: string;
};

type Topico = {
  nombre: string;
  traduccion: string;
  explicacion: string;
  ejemplo: string;
  pistas: string;
  ib: string;
};

// ── DATOS ────────────────────────────────────────────────────

const TAG_STYLE: Record<string, CSSProperties> = {
  Base: { backgroundColor: L.bg2, borderColor: L.line, color: L.muted },
  Poesía: { backgroundColor: CRIT.B + "12", borderColor: CRIT.B + "40", color: CRIT.B },
  Narrativa: { backgroundColor: L.amber + "16", borderColor: L.amber + "55", color: L.amberDeep },
  Teatro: { backgroundColor: L.ok + "12", borderColor: L.ok + "40", color: L.ok },
  Contexto: { backgroundColor: CRIT.A + "12", borderColor: CRIT.A + "40", color: CRIT.A },
  IB: { backgroundColor: CRIT.D + "10", borderColor: CRIT.D + "38", color: CRIT.D },
  Escritura: { backgroundColor: L.ok + "10", borderColor: L.ok + "38", color: L.ok },
  Teoría: { backgroundColor: L.primary + "10", borderColor: L.primary + "38", color: L.primary },
  Clásicos: { backgroundColor: L.amber + "16", borderColor: L.amber + "55", color: L.amberDeep },
};

function tagStyle(tag: string): CSSProperties {
  return TAG_STYLE[tag] ?? TAG_STYLE.Base;
}

const TEORIAS_EN: {
  nombre: string;
  lema: string;
  explicacion: string;
  preguntas: string[];
  ejemplo: string;
  enElIB: string;
}[] = [
  {
    nombre: "Psychoanalysis",
    lema: "Texts, like dreams, say more than they appear to",
    explicacion:
      "Applies Freud's ideas to the text: it looks for repressed desires, unconscious fears and psychic conflicts in characters, symbols and images. The point is not to psychoanalyse the author; the point is to read the text as if it were a collective dream.",
    preguntas: [
      "What desires or fears does the character's behaviour reveal?",
      "Are there symbols of death, eroticism or transgression?",
      "Does the text hide or disguise something the reader can decode?",
      "Is there a relevant father, mother or authority figure?",
    ],
    ejemplo:
      "Hamlet's notorious procrastination has been read in Freudian terms as an Oedipal paralysis: the prince cannot kill Claudius because Claudius has acted out Hamlet's own repressed desire (to displace the father, to possess the mother). The closet scene with Gertrude and the obsession with her «incestuous sheets» make the unconscious conflict visible. Sylvia Plath's «Daddy» works similar territory openly, staging a paternal complex through the chant «Daddy, daddy, you bastard, I'm through.»",
    enElIB:
      "Analyse a symbol or a behavioural pattern and argue what psychic conflict or repressed desire it represents. Don't make claims about the author's biography; analyse the text. A line like «the speaker's recurring images of locked rooms suggest a self under pressure from forces it cannot name» is psychoanalytic without being amateur clinical.",
  },
  {
    nombre: "Feminist theory",
    lema: "Whom does the text give voice to? Whom does it silence?",
    explicacion:
      "Examines how gender shapes the experience of characters and the narrative voice. It asks how women are represented, which stereotypes the text reproduces or challenges, and which voices are pushed to the margins.",
    preguntas: [
      "Do female characters have agency (the capacity to decide), or are they objects of others' desire?",
      "Does the narrative voice adopt a male or female perspective?",
      "Does the text reinforce gender roles or question them?",
      "Which characters hold power and which do not, and why?",
    ],
    ejemplo:
      "Charlotte Perkins Gilman's «The Yellow Wallpaper» dramatises a woman driven mad by the «rest cure» a male doctor-husband prescribes; the wallpaper she peels off becomes the figure of every other woman the patriarchal house has trapped. Charlotte Brontë's Jane Eyre speaks the famous claim «I am no bird; and no net ensnares me», while Atwood's The Handmaid's Tale shows how a society can re-engineer women into wombs. A feminist reading asks not whether these texts «like» or «dislike» women but how they expose the machinery.",
    enElIB:
      'Identify the role of a female character and argue whether the text problematises or normalises it. Avoid moral judgements ("this is sexist") and focus on craft: how does the syntax, the imagery, the focalisation construct that gendered position?',
  },
  {
    nombre: "Reception theory",
    lema: "Meaning is built by the reader, not only by the writer",
    explicacion:
      "The same text can mean very different things to readers from different periods or cultures. Every reader brings their own horizon of expectations: knowledge, values, prejudices. Meaning is always a negotiation between text and reader.",
    preguntas: [
      "What did I expect when I started reading this text, and how were those expectations met or frustrated?",
      "How might a reader from the author's own time have read it?",
      "Does the text leave gaps or ambiguities the reader must fill in?",
      "What effect does it produce on me as a reader, and why?",
    ],
    ejemplo:
      "Conrad's Heart of Darkness was read for decades as a daring critique of imperial Europe. In 1975 Chinua Achebe famously called Conrad «a thoroughgoing racist», and the text was suddenly a different book — not because it had changed but because its readers had. Hamlet has migrated similarly: a revenge play for the Elizabethans, a Romantic study of indecision for Coleridge, a case file for Freud, a play about surveillance for the post-war stage. No reading is «the» correct one; each tells us something about the reader's own period.",
    enElIB:
      "Comment on the effect the text produces on the reader and whether that effect depends on internal cues of the text or on the reader's context. It is valid to write: «A contemporary reader might interpret this image as...» — provided you ground the claim in the language on the page.",
  },
  {
    nombre: "Marxism / Social criticism",
    lema: "Which social class do the characters belong to? Whom does the text serve?",
    explicacion:
      "Reads literature as a reflection of, or challenge to, relationships of economic and social power. It examines who holds power in the text, how class inequality is reproduced, and whether the text normalises or critiques that system.",
    preguntas: [
      "Which social class do the main and secondary characters represent?",
      "Does the text show conflicts between classes or social groups?",
      "Are there exploited or marginalised characters? How does the narrator represent them?",
      "Whose interests does the worldview proposed by the text favour?",
    ],
    ejemplo:
      "Dickens's Hard Times turns the industrial city of Coketown — its «monstrous serpents of smoke» and its utilitarian schoolmaster Mr Gradgrind — into a diagnosis of capitalism reducing workers to «hands». Steinbeck's The Grapes of Wrath traces the Joad family's dispossession by the banks; Orwell's Animal Farm allegorises a revolution recolonised by a new ruling class; Raymond Carver's minimalist stories let working-class silence carry the critique. A Marxist reading asks not only what the text describes but whose worldview its form quietly endorses.",
    enElIB:
      "If the text shows social inequality, comment on the position the narrator takes towards it: does it critique, naturalise, or ironise it? A paragraph that links social class to the text's formal choices (free indirect discourse, register, who gets dialogue) is at IB level.",
  },
  {
    nombre: "Formalism / New Criticism",
    lema: "The text is enough: everything that matters is in the words",
    explicacion:
      "Proposes reading the text as an autonomous object. The author's biography, historical context and stated intentions are irrelevant: only what is written counts. It analyses form, style and the tension between what is said and how it is said.",
    preguntas: [
      "How is the text constructed? Which formal features stand out most?",
      "Is there tension or irony between what the text says and how it says it?",
      "What does the language do to produce its specific effect?",
      "Are there patterns of repetition, contrast or symmetry that organise the text?",
    ],
    ejemplo:
      "A New Critical reading of Frost's «The Road Not Taken» refuses the popular sentimental gloss («take the brave path»). It notices instead that the speaker admits the two roads were «really about the same», and that the famous claim «I took the one less travelled by» is reported with «a sigh» from a future where the speaker is rewriting the past. The poem's meaning lives in that ironic gap. Donne's «The Sun Rising» yields similarly to close reading: the speaker's mock-heroic apostrophe «Busy old fool, unruly sun» enacts the paradox the poem dismantles.",
    enElIB:
      "Paper 1 is, by design, a formalist exercise: you are given a text without biographical context and you must analyse it from within. This is the central skill of the exam. When you write «the writer uses X to achieve Y», you are doing formalism.",
  },
  {
    nombre: "Structuralism",
    lema: "The text has a hidden grammar that organises it",
    explicacion:
      "Looks in texts for deep structures that organise meaning: binary oppositions (life/death, city/countryside, masculine/feminine), narrative archetypes and sign systems. It does not analyse content; it analyses the system that produces it.",
    preguntas: [
      "Which binary oppositions structure the text?",
      "Does the protagonist follow an archetypal pattern (hero, trial, transformation)?",
      "Is there a system of values that organises the world of the text?",
      "Which characters or elements represent the two sides of a central opposition?",
    ],
    ejemplo:
      "The Great Gatsby is built on a network of binaries: East Egg vs West Egg, old money vs new money, Daisy's «voice full of money» vs Gatsby's self-invented past, the green light vs the valley of ashes. The whole moral geography of the novel sorts itself along that grid, and Gatsby's tragedy is that he tries to cross from one side to the other. Shakespeare's comedies similarly run on opposed pairs (court/forest in As You Like It, day/night in A Midsummer Night's Dream) that the play has to mediate before it can end.",
    enElIB:
      "Identify a central binary opposition (light/darkness, order/chaos, public/private) and analyse how the characters and the language position themselves in relation to it. It's a strong scaffold for an essay's thesis.",
  },
  {
    nombre: "Postcolonialism",
    lema: "From whose point of view is this story being told?",
    explicacion:
      "Examines how literature reproduces or challenges power relations between dominant and colonised cultures. It analyses who has voice in the text, which cultures are presented as normal and which as exotic, and how language can be either an instrument of domination or of resistance.",
    preguntas: [
      "From what cultural or social position is the story narrated?",
      "Are there characters whose culture or identity is exoticised or made inferior?",
      "Does the text reproduce colonial stereotypes or dismantle them?",
      "Who has no voice in this text, and why?",
    ],
    ejemplo:
      "Achebe's Things Fall Apart writes the Igbo world from inside, with proverbs, Igbo words and a narrator who knows the village — explicitly answering Conrad's Africa, where the colonised have no inner life. Derek Walcott's «A Far Cry from Africa» dramatises the bilingual conscience («I who have cursed / The drunken officer of British rule, how choose / Between this Africa and the English tongue I love?»); Rushdie's «chutnification» of English and Arundhati Roy's capitalised Anglo-Indian neologisms turn the coloniser's language into a tool of self-definition.",
    enElIB:
      "If the text comes from a postcolonial context or mixes languages and traditions, comment on how the language itself is a political act. Avoid reading non-Western texts using only the criteria of the British canon.",
  },
  {
    nombre: "Intertextuality",
    lema: "No text is born from nothing: every text dialogues with other texts",
    explicacion:
      "Every text is woven from references to other texts: quotations, allusions, parodies, rewritings. This is not a deficiency; it is the natural condition of literature. The dialogue can be explicit (direct quotation) or implicit (thematic, structural or stylistic echoes).",
    preguntas: [
      "Does the text allude to other texts, myths or literary traditions?",
      "Does it rewrite or parody an earlier text?",
      "What does that intertextual dialogue add to the meaning of the text?",
      "Does the reader need to know the original text in order to understand the reference?",
    ],
    ejemplo:
      "Joyce's Ulysses maps a single Dublin day onto Homer's Odyssey, so that an ad-canvasser becomes Odysseus and a publican becomes the Cyclops. T. S. Eliot's The Waste Land collages fragments from Dante, Shakespeare, the Upanishads and London pub talk into a single ruined voice. Atwood's The Penelopiad retells the Odyssey from the wife and the hanged maids; Stoppard's Rosencrantz and Guildenstern Are Dead lives in the wings of Hamlet. Knowing the source-text doesn't replace reading the new one — it deepens it.",
    enElIB:
      "If you recognise a mythical, biblical or literary allusion, explain what that reference adds to the meaning. You're not expected to know everything, but if you do recognise it, naming it — and reasoning about why the writer is borrowing it — clearly raises the level of analysis.",
  },
];

const TOPICOS_EN: Topico[] = [
  {
    nombre: "Carpe diem",
    traduccion: "Seize the day",
    explicacion:
      "Life is short and pleasure must be enjoyed now, before death arrives. It's not nihilism: it's an urgent invitation to live. Time passes and does not wait.",
    ejemplo:
      "Robert Herrick, «To the Virgins, to Make Much of Time»: «Gather ye rosebuds while ye may, / Old Time is still a-flying.» Andrew Marvell, «To His Coy Mistress»: «Had we but world enough, and time...» — and then the famous turn: «But at my back I always hear / Time's wingèd chariot hurrying near.»",
    pistas:
      "Images of flowers fading, vanishing beauty, fleeting youth. Verbs in the imperative (live, gather, seize, enjoy). Temporal urgency. Often a seductive address to a younger or reluctant listener.",
    ib: "Analyse the urgency the text creates and what it says about the speaker's relationship with time or death. If there are imperatives, comment on their effect — and on who has the power to issue them.",
  },
  {
    nombre: "Tempus fugit",
    traduccion: "Time flies",
    explicacion:
      "Time passes irreversibly and we cannot stop it. Unlike carpe diem (which urges us to act), tempus fugit pauses to contemplate the loss with melancholy.",
    ejemplo:
      "Shakespeare, Sonnet 60: «Like as the waves make towards the pebbled shore, / So do our minutes hasten to their end.» Marvell's «Time's wingèd chariot». Tennyson's elegiac late poems. The clock and the wave are the topos's recurring emblems.",
    pistas:
      "Verbs of passing and change (has gone, no more, has fled, hastens). Comparisons with rivers, waves, winds or shadows that disappear. Melancholic or elegiac tone.",
    ib: "Comment on which formal devices (verb tenses, images of movement or disappearance, the rhythm of the line itself) reinforce the sense of time slipping away.",
  },
  {
    nombre: "Memento mori",
    traduccion: "Remember you must die",
    explicacion:
      "Death is inevitable and universal. Constantly remembering this should help orient one's life towards what matters. It is not despair, but a call to lucidity.",
    ejemplo:
      "John Donne, Holy Sonnet 10: «Death, be not proud, though some have callèd thee / Mighty and dreadful, for thou art not so.» Gerard Manley Hopkins, «Spring and Fall»: «It is the blight man was born for, / It is Margaret you mourn for.» Hamlet contemplating Yorick's skull («Alas, poor Yorick!») is the iconic English stage memento mori.",
    pistas:
      "Symbols of death (skull, clock, ashes, withered leaf). Direct reflections on mortality. Second-person address to the reader or to an abstraction.",
    ib: "Analyse the effect on the reader of being directly confronted with death, and what worldview that gesture implies.",
  },
  {
    nombre: "Ubi sunt",
    traduccion: "Where are they?",
    explicacion:
      "A rhetorical question about the whereabouts of the great, the powerful or the beautiful of the past. The implied answer is always the same: time has carried them off. It is an elegiac lament for what disappears.",
    ejemplo:
      "The Anglo-Saxon poem «The Wanderer»: «Hwær cwom mearg? Hwær cwom mago?» («Where is the horse gone? Where the rider?»). Hamlet at the graveside: «Where be your gibes now? your gambols? your songs?» Tennyson's «Tears, Idle Tears» works the same elegiac vein.",
    pistas:
      "Rhetorical questions about people or things from the past. Lists of vanished figures or pleasures. A tone of astonishment before ruin or oblivion.",
    ib: "Analyse the function of the accumulated rhetorical questions: what effect does that catalogue of losses produce on the reader? What is the reader being invited to mourn?",
  },
  {
    nombre: "Locus amoenus",
    traduccion: "Pleasant place",
    explicacion:
      "The ideal place: a meadow with water, shade and a soft breeze where the speaker can rest, love or reflect. It is a space of harmony and peace, removed from social noise.",
    ejemplo:
      "Marvell's «The Garden»: «What wondrous life is this I lead! / Ripe apples drop about my head.» The Forest of Arden in Shakespeare's As You Like It, where the exiled court rediscovers itself. Wordsworth's «Lines Composed a Few Miles above Tintern Abbey», with its «steep and lofty cliffs» and «pastoral farms / Green to the very door».",
    pistas:
      "Meadow, river or fountain, shade-giving tree, soft breeze, birdsong, ripe fruit. Positive, sensory adjectives. A contemplative narrative pause; often the city is just offstage.",
    ib: "Analyse the function of that space in the text: does it contrast with human conflict? Does it reflect or contradict the speaker's emotional state?",
  },
  {
    nombre: "Locus horridus",
    traduccion: "Terrible place",
    explicacion:
      "The opposite of the locus amoenus: a hostile, dark, threatening nature that mirrors the inner chaos of the character or the dark tone of the text.",
    ejemplo:
      "Coleridge's «Kubla Khan», with its «deep romantic chasm» and «caverns measureless to man, / Down to a sunless sea». Eliot's The Waste Land: «A heap of broken images, where the sun beats, / And the dead tree gives no shelter.» The icy polar wastes that frame Mary Shelley's Frankenstein.",
    pistas:
      "Dark, threatening or decaying nature. Negative adjectives (arid, gloomy, sunless, suffocating). Space as a projection of the character's inner state.",
    ib: "Analyse how the setting amplifies the character's emotional state or the tone of the passage. A hostile natural setting is rarely just decoration: it is almost always a symbol.",
  },
  {
    nombre: "Beatus ille",
    traduccion: "Happy is the one...",
    explicacion:
      "Praise of the simple country life as opposed to the ambitious life of the city or the court. The countryside represents authenticity, peace and a life lived in accordance with nature.",
    ejemplo:
      "Marvell's «The Garden»: «Society is all but rude / To this delicious solitude.» Wordsworth's pastoral lyrics from the Lyrical Ballads. Pope's «Ode on Solitude»: «Happy the man, whose wish and care / A few paternal acres bound...» — a direct English Horatian descendant.",
    pistas:
      "Praise of a simple life and the countryside. Implicit criticism of ambition or court/city life. An invitation to withdraw from the world. Vocabulary of peace and sufficiency.",
    ib: "Connect this topos with the values the text defends: what does the speaker reject? Is it personal escapism or veiled social critique?",
  },
  {
    nombre: "Aurea mediocritas",
    traduccion: "Golden mean",
    explicacion:
      "The Horatian ideal of the moderate life: neither too rich nor too poor, far from extremes. Happiness lies in sufficiency, not in excess or in deprivation.",
    ejemplo:
      "Pope's Epistles, with their measured praise of «the middle state» and their satire of overreaching wits and lords. Wordsworth's preference for «low and rustic life» over the glittering metropolis. Any English poem that quietly recommends «enough» against either luxury or want.",
    pistas:
      "Praise of the moderate and the sufficient. Rejection of ambition and luxury. Vocabulary of balance (enough, sufficient, neither more nor less, the middle way).",
    ib: "Analyse what moral worldview this implies and whether the text defends it, questions it, or presents it as an unattainable ideal.",
  },
  {
    nombre: "Fortuna mutabilis",
    traduccion: "Fortune is changeable",
    explicacion:
      "The goddess Fortune turns her wheel ceaselessly: whoever is on top today will fall tomorrow. It is a warning against pride and a consolation for the one who is down.",
    ejemplo:
      "King Lear, who begins on the throne and ends on a heath crying «I am a very foolish fond old man.» Macbeth, lifted by the witches' prophecy and crushed by it. Thomas Hardy's novels (Tess, Jude), where chance and circumstance crush their protagonists with almost mythological indifference.",
    pistas:
      "The image of the wheel. Sudden rises and falls of characters. Warnings against pride. Exempla of great fallen figures.",
    ib: "Analyse the function of Fortune's wheel in the text's worldview: is it fatalism, moral lesson, or both?",
  },
  {
    nombre: "Homo viator",
    traduccion: "Man the traveller",
    explicacion:
      "Life as a journey, a path travelled towards a destination (death, God, wisdom). The traveller learns along the way; the road is life itself.",
    ejemplo:
      "Bunyan's The Pilgrim's Progress, in which Christian walks from the City of Destruction to the Celestial City. Robert Frost's «The Road Not Taken»: «Two roads diverged in a yellow wood.» Walt Whitman's «Song of the Open Road»: «Afoot and light-hearted I take to the open road.»",
    pistas:
      "Vocabulary of travel and road. Stages, obstacles, trials that transform the character. The destination as a vital or spiritual goal.",
    ib: "Analyse how the outward journey reflects an inner one: learning, loss, maturation. What transforms the character along the way?",
  },
  {
    nombre: "Vita flumen",
    traduccion: "Life is a river",
    explicacion:
      "Life compared to a river that flows ceaselessly to the sea, which is death. The image expresses the inevitability of the passage of time and the single direction of fate.",
    ejemplo:
      "Tennyson, «The Brook»: «For men may come and men may go, / But I go on for ever.» T. S. Eliot, «The Dry Salvages»: «I do not know much about gods; but I think that the river / Is a strong brown god.» Langston Hughes, «The Negro Speaks of Rivers»: «I've known rivers ancient as the world...»",
    pistas:
      "Explicit comparison or metaphor of the river, the flow, the current. The sea as final destination. Verbs of continuous and irreversible movement.",
    ib: "Analyse how the river image condenses the vision of time and history. What emotions does that image of unreturning movement produce in the reader?",
  },
  {
    nombre: "Theatrum mundi",
    traduccion: "The world is a stage",
    explicacion:
      "Life is a performance: God or fate is the director, human beings are actors playing a role we did not choose, and death drops the curtain. Existence is no more real than a play.",
    ejemplo:
      "The locus classicus in English is Jaques in As You Like It: «All the world's a stage, / And all the men and women merely players; / They have their exits and their entrances...» Macbeth's «Life's but a walking shadow, a poor player / That struts and frets his hour upon the stage» refines the same metaphor into despair.",
    pistas:
      "Theatrical vocabulary in non-theatrical contexts (role, scene, perform, mask, exit). Life as illusion or deception. Reflections on free will.",
    ib: "Analyse the philosophical function of this metaphor: what does it say about a character's identity, free will or the meaning of life?",
  },
  {
    nombre: "Vanitas vanitatum",
    traduccion: "Vanity of vanities",
    explicacion:
      "Everything in the world is vain, fleeting, insignificant. Wealth, beauty, power: all of it withers and disappears. Biblical origin (Ecclesiastes). Recurrent across English religious and modernist verse.",
    ejemplo:
      "Donne, «A Valediction: of the Book», on works that survive their authors only briefly. T. S. Eliot, «The Hollow Men»: «We are the hollow men / We are the stuffed men / Leaning together / Headpiece filled with straw.» Shelley's «Ozymandias», whose desert pedestal still boasts: «Look on my works, ye Mighty, and despair!»",
    pistas:
      "Images of ruins, withered objects, decaying monuments. Reflections on the futility of human effort. A disenchanted or melancholic tone.",
    ib: "Analyse how the objects or images of the text embody vanity: what worldview do they convey? What do they invite the reader to reconsider?",
  },
  {
    nombre: "Somnium vitae",
    traduccion: "Life is a dream",
    explicacion:
      "Life is illusory, fleeting, with no firm reality. Upon waking (death), it is revealed that everything was fiction. We do not know whether what we live is real.",
    ejemplo:
      "Prospero in The Tempest: «We are such stuff / As dreams are made on, and our little life / Is rounded with a sleep.» Keats's «Ode to a Nightingale» ends on the same uncertainty: «Was it a vision, or a waking dream? / Fled is that music: — Do I wake or sleep?»",
    pistas:
      "Oneiric vocabulary outside its literal context (dream, vision, sleep, waking, illusion, shadow). Characters who doubt their own experience.",
    ib: "Analyse what vision of reality the text proposes: is the world real or illusory? What consequences does that uncertainty have for the speaker or characters?",
  },
  {
    nombre: "Collige, virgo, rosas",
    traduccion: "Gather, maiden, the roses",
    explicacion:
      "A variant of carpe diem addressed to a young woman: enjoy your beauty and youth now, before they fade. It carries an implicit erotic dimension and is rarely innocent.",
    ejemplo:
      "Robert Herrick, «To the Virgins, to Make Much of Time», whose first line is the topos in English: «Gather ye rosebuds while ye may.» Marvell's «To His Coy Mistress» pushes the seduction harder: «The grave's a fine and private place, / But none, I think, do there embrace.»",
    pistas:
      "Flowers as a symbol of feminine beauty that fades. Imperative addressed to a young woman. Temporal urgency. An amorous or seductive tone, sometimes with menace under it.",
    ib: "Comment on the gender dimension: does the text instrumentalise feminine beauty or celebrate it? What power relation does the speaker imply with the addressee?",
  },
  {
    nombre: "Descriptio puellae",
    traduccion: "Description of the maiden",
    explicacion:
      "Idealised description of feminine beauty according to a fixed Petrarchan canon: from top to bottom, golden hair, white forehead, light eyes, rosy cheeks, red lips, pearl-white teeth. It is a literary convention, not a real portrait.",
    ejemplo:
      "Spenser's blazons in his Amoretti and the Epithalamion catalogue the beloved's features through the conventional jewels and metals. Shakespeare's Sonnet 130 famously subverts the topos: «My mistress' eyes are nothing like the sun; / Coral is far more red than her lips' red... / And yet, by heaven, I think my love as rare / As any she belied with false compare.»",
    pistas:
      "Enumeration of physical features from top to bottom. Comparisons with noble materials (gold, snow, coral, ruby, pearl). Superlative adjectives. No psychology of the character.",
    ib: "Analyse the function of idealisation: does the text present a real person or a cultural ideal? If the text subverts the convention (as Sonnet 130 does), what is the effect?",
  },
  {
    nombre: "Donna angelicata",
    traduccion: "The angelic lady",
    explicacion:
      "The beloved is an angel, an almost divine being who spiritually elevates the lover. Her beauty is not merely physical: it is a manifestation of the sacred that brings the lover closer to God or to the Platonic ideal.",
    ejemplo:
      "Sir Philip Sidney's Astrophil and Stella and Spenser's Amoretti import the Petrarchan tradition into English, casting the beloved as a beam of heavenly light. W. B. Yeats's sequence around Maud Gonne — «No Second Troy», «Among School Children» — idealises her as a Helen-like, almost mythological figure who spiritually outranks the lover.",
    pistas:
      "The beloved described with celestial vocabulary (angel, divine, heaven, light, grace). Purifying effect on the lover. Enormous distance between lover and beloved.",
    ib: "Analyse how this idealisation defines the relationship: is there equality? Can the lover really love someone so distant? What does this say about the kind of love the text proposes?",
  },
  {
    nombre: "Amor post mortem",
    traduccion: "Love beyond death",
    explicacion:
      "Love is so powerful that it transcends death: the lovers are reunited in the afterlife, or the death of the beloved does not extinguish the love of the survivor.",
    ejemplo:
      "Edgar Allan Poe, «Annabel Lee»: «And neither the angels in heaven above, / Nor the demons down under the sea, / Can ever dissever my soul from the soul / Of the beautiful Annabel Lee.» Donne's «A Valediction: Forbidding Mourning» argues that lovers' souls are joined like the legs of a compass even when bodies part. Romeo and Juliet die into a love their families could not let them live.",
    pistas:
      "Death of one or both lovers. Promises of eternal reunion. Love that intensifies as death approaches. The afterlife as a space for love.",
    ib: "Analyse the vision of love the text proposes: is it Romanticism, spirituality, or both? Does death destroy love or perfect it?",
  },
  {
    nombre: "Contemptus mundi",
    traduccion: "Contempt of the world",
    explicacion:
      "The earthly world is corruptible, deceptive and worthless. True life lies in the afterlife or in renouncing the material. It is the most extreme face of vanitas.",
    ejemplo:
      "Donne's Holy Sonnets repeatedly turn from the world towards God: «Batter my heart, three-personed God» asks for the violent erasure of the worldly self. W. B. Yeats's «Sailing to Byzantium» rejects «that country» of the merely living — «whatever is begotten, born, and dies» — for «the artifice of eternity».",
    pistas:
      "Explicit rejection of worldly pleasures. Ascetic or visionary vocabulary. Comparisons between the world and dust, smoke or shadow. A call to spiritual or aesthetic transcendence.",
    ib: "Analyse the relationship the text proposes between the material and the spiritual: is the rejection of the world liberation, escapism, or a form of social critique?",
  },
  {
    nombre: "The equalizing power of death",
    traduccion: "Death makes us all equal",
    explicacion:
      "Before death, rich and poor, kings and beggars, the wise and the ignorant are all equal. It is a democratic, subversive topos: death dismantles social hierarchies.",
    ejemplo:
      "The gravedigger scene in Hamlet, where the prince picks up Yorick's skull and reflects that even Alexander the Great is now «stopping a bunghole». Donne's «Death, be not proud» addresses Death as a mere servant of «poppy or charms». Shelley's «Ozymandias» reduces a tyrant to «two vast and trunkless legs of stone» in the desert.",
    pistas:
      "Characters of very different social classes facing death on the same terms. Emphasis on the fact that power does not save. An egalitarian or ironic tone before the vanity of the powerful.",
    ib: "Analyse the social critique this topos implies in the text: is it consolation for the humble, warning to the powerful, or both at once?",
  },
  {
    nombre: "The golden age",
    traduccion: "The best age was in the past",
    explicacion:
      "In a remote past, human beings lived in harmony, innocence and happiness. The present is a degradation of that ideal. It can be a lost mythical age, a childhood, or a utopia.",
    ejemplo:
      "Yeats's «Sailing to Byzantium» imagines the lost city as «monuments of unageing intellect» — a golden age of art set against modern decay. Wordsworth's «Ode: Intimations of Immortality» locates the golden age in childhood: «There was a time when meadow, grove, and stream... / Apparelled in celestial light.» Milton's prelapsarian Eden in Paradise Lost is the topos's grandest English staging.",
    pistas:
      "Nostalgia for the past. Contrast between an ideal before and a degraded now. Vocabulary of innocence, harmony, uncorrupted nature.",
    ib: "Analyse what values the speaker defends through this idealisation of the past, and what critique it implies about the present.",
  },
  {
    nombre: "Praise of country life over the court",
    traduccion: "The city corrupts, the countryside purifies",
    explicacion:
      "Court or city life is ambition, hypocrisy and corruption. Country life is honest, simple and true. It is not always naive: at times it is veiled political critique.",
    ejemplo:
      "Marvell's «The Garden» rejects «the busy companies of men» for «a green thought in a green shade». Wordsworth in the Preface to Lyrical Ballads explicitly defends «low and rustic life» as the truer subject of poetry. Pope's «Ode on Solitude» and his Epistles routinely set the corrupt town against the dignified country estate.",
    pistas:
      "Explicit city/countryside (or court/country) contrast. Negative adjectives for the city (artificial, busy, deceptive) and positive ones for the country (peace, truth, nature). A voice with experience of both worlds.",
    ib: "Analyse the vision of society the text proposes: is it personal escapism, critique of power, or nostalgia? Is the countryside a real solution or an unattainable ideal?",
  },
  {
    nombre: "Militia amoris",
    traduccion: "Love is war",
    explicacion:
      "Love is described with military vocabulary: the beloved is a fortress, the lover is a soldier laying siege, glances are arrows, the heart is the battlefield.",
    ejemplo:
      "Donne's «The Canonization» («call us what you will, we are made such by love») and especially Holy Sonnet 14, «Batter my heart, three-personed God», take the topos to its violent extreme: «Take me to you, imprison me, for I, / Except you enthral me, never shall be free.» Shakespeare's sonnets are full of love-as-siege imagery, and Sidney's Astrophil suffers Cupid's arrows on cue.",
    pistas:
      "Martial metaphors (arrow, wound, surrender, victory, siege, shield, battle). The beloved as a fortress or enemy. The lover as a defeated or willing captive.",
    ib: "Analyse the power relation this metaphor implies: who holds the power in this 'war'? Is the beloved active or passive? Does the text celebrate that dynamic or critique it?",
  },
  {
    nombre: "Religio amoris",
    traduccion: "Love as religion",
    explicacion:
      "Love becomes a secular religion: the beloved is a goddess, the lover is a devotee, love is a cult with its rituals and its martyrs. The whole religious vocabulary is applied to love.",
    ejemplo:
      "Donne mixes the registers constantly: in «The Canonization» the lovers become saints («we'll build in sonnets pretty rooms; / As well a well-wrought urn becomes / The greatest ashes, as half-acre tombs»), and in «The Relic» a lock of hair becomes a relic «of a saint». Robert Browning's love lyrics («Meeting at Night», «Love Among the Ruins») hush in front of the beloved as before an altar.",
    pistas:
      "Religious vocabulary in an amorous context (worship, pray, temple, saint, miracle, devotee, martyrdom, ecstasy, relic).",
    ib: "Analyse the effect of mixing the sacred and the profane: does it elevate love, ironise religion, or both? What does it say about the intensity of feeling?",
  },
  {
    nombre: "Omnia vincit amor",
    traduccion: "Love conquers all",
    explicacion:
      "Love is the most powerful force in the universe: it overcomes death, time, power and reason. It is irresistible and inevitable; no will can stop it.",
    ejemplo:
      "Shakespeare, Sonnet 116: «Love is not love / Which alters when it alteration finds... / Love's not Time's fool, though rosy lips and cheeks / Within his bending sickle's compass come.» Spenser's Amoretti closes its sequence on a marriage that survives every adversary; Browning's «Sonnets from the Portuguese» 43 («How do I love thee? Let me count the ways») insists love will outlive death.",
    pistas:
      "Love presented as a superhuman, irresistible force. Characters who act against their reason or interest because of love. Love as the ultimate explanation for actions.",
    ib: "Analyse whether the text celebrates this omnipotence of love or problematises it: is love a liberating force or a loss of will and reason?",
  },
  {
    nombre: "Exegi monumentum",
    traduccion: "I have raised a monument",
    explicacion:
      "The conviction that the literary work is more lasting than marble, empires or human life. The poet declares that their writing will make the subject — and themselves — immortal.",
    ejemplo:
      "Shakespeare, Sonnet 55, is the canonical English instance: «Not marble, nor the gilded monuments / Of princes, shall outlive this powerful rhyme.» Sonnet 18 closes on the same boast: «So long as men can breathe, or eyes can see, / So long lives this, and this gives life to thee.» Yeats's «Sailing to Byzantium», with its bird «of hammered gold and gold enamelling», is a modernist refraction of the same claim.",
    pistas:
      "Comparison between the work and lasting materials (bronze, stone, marble, gold). Affirmation that writing outlasts time, war or death. Pride or consolation in the face of mortality.",
    ib: "Analyse what this topos says about the relationship between the artist, their work and immortality. Is it pride, consolation, or both?",
  },
];

const SECCIONES: Seccion[] = [
  {
    id: "movimientos",
    titulo: "Movimientos literarios",
    tituloEN: "Literary movements",
    descripcion:
      "Del Romanticismo al Boom latinoamericano: características, autores y contexto histórico.",
    descripcionEN:
      "From Romanticism to the Latin American Boom: characteristics, authors, and historical context.",
    tag: "Contexto",
  },
  {
    id: "poesia",
    titulo: "Poesía",
    tituloEN: "Poetry",
    descripcion:
      "Hablante lírico y sinónimos, métrica, isosilabismo, encabalgamiento, soneto y romance.",
    descripcionEN:
      "Lyric speaker and synonyms, meter, isosyllabism, enjambment, sonnet, and romance.",
    tag: "Poesía",
  },
  {
    id: "narratologia",
    titulo: "Narratología",
    tituloEN: "Narratology",
    descripcion:
      "Tipos de narrador, tiempo narrativo, espacio y estructura en la prosa de ficción.",
    descripcionEN: "Types of narrator, narrative time, space, and structure in prose fiction.",
    tag: "Narrativa",
  },
  {
    id: "teatro",
    titulo: "Teatro",
    tituloEN: "Theatre",
    descripcion:
      "Origen, elementos del texto dramático (acotaciones, aparte, soliloquio) y géneros teatrales.",
    descripcionEN:
      "Origins, elements of dramatic text (stage directions, asides, soliloquy), and theatrical genres.",
    tag: "Teatro",
  },
  {
    id: "recursos",
    titulo: "Recursos literarios en el examen IB",
    tituloEN: "Literary devices in the IB exam",
    descripcion:
      "Cómo analizar (no solo identificar) un recurso. Errores frecuentes y estructura de respuesta.",
    descripcionEN:
      "How to analyze a device (not just identify it). Common mistakes and response structure.",
    tag: "IB",
  },
  {
    id: "vocabulario",
    titulo: "Vocabulario de análisis literario",
    tituloEN: "Literary analysis vocabulary",
    descripcion:
      "Conectores del discurso, verbos analíticos y evaluativos, adverbios, sinónimos clave y frases de arranque.",
    descripcionEN:
      "Discourse connectors, analytical and evaluative verbs, adverbs, key synonyms, and opening phrases.",
    tag: "Escritura",
  },
  {
    id: "teoria-literaria",
    titulo: "Teoría literaria",
    tituloEN: "Literary theory",
    descripcion:
      "Psicoanálisis, feminismo, marxismo, formalismo, intertextualidad y más: cómo usar cada enfoque en un comentario real.",
    descripcionEN:
      "Psychoanalysis, feminism, Marxism, formalism, intertextuality, and more: how to use each approach in an actual commentary.",
    tag: "Teoría",
  },
  {
    id: "topicos",
    titulo: "Tópicos literarios",
    tituloEN: "Literary topics",
    descripcion:
      "23 tópicos clásicos en tarjetas interactivas: carpe diem, locus amoenus, vanitas, theatrum mundi y mucho más.",
    descripcionEN:
      "Classical literary topics in interactive cards: carpe diem, locus amoenus, vanitas, theatrum mundi, and many more.",
    tag: "Clásicos",
  },
];

// ── HELPERS ──────────────────────────────────────────────────

function H3({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="mb-2 mt-5 text-base font-semibold" style={headingStyle}>
      {children}
    </h3>
  );
}

function Def({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <div className="theory-soft-card space-y-1 rounded-2xl border p-4">
      <div
        className="text-[10px] font-semibold uppercase tracking-[0.18em]"
        style={{ ...fontMono, color: L.muted }}
      >
        {titulo}
      </div>
      <div className="text-sm leading-relaxed" style={{ color: L.ink }}>
        {children}
      </div>
    </div>
  );
}

function TipIB({ children, isEN = false }: { children: React.ReactNode; isEN?: boolean }) {
  return (
    <div
      className="rounded-2xl border p-4"
      style={{ backgroundColor: L.primary + "0c", borderColor: L.primary + "2f" }}
    >
      <div
        className="mb-2 text-[10px] font-semibold uppercase tracking-[0.18em]"
        style={{ ...fontMono, color: L.primary }}
      >
        {isEN ? "IB Tip" : "Consejo IB"}
      </div>
      <div className="text-sm leading-relaxed" style={{ color: L.ink }}>
        {children}
      </div>
    </div>
  );
}

function Tabla({ cabeceras, filas }: { cabeceras: string[]; filas: string[][] }) {
  return (
    <div className="overflow-x-auto rounded-2xl border" style={{ borderColor: L.line }}>
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr style={{ backgroundColor: L.bg2 }}>
            {cabeceras.map((h) => (
              <th
                key={h}
                className="border p-2.5 text-left font-semibold"
                style={{ borderColor: L.line, color: L.ink }}
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {filas.map((fila, i) => (
            <tr key={i} style={{ backgroundColor: i % 2 === 1 ? L.primary + "08" : L.surface }}>
              {fila.map((celda, j) => (
                <td
                  key={j}
                  className="border p-2.5 align-top"
                  style={{ borderColor: L.line, color: L.muted }}
                >
                  {celda}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function TarjetaTopico({ topico, isEN }: { topico: Topico; isEN: boolean }) {
  const [abierta, setAbierta] = useState(false);
  const toggle = () => setAbierta((a) => !a);
  return (
    <button
      type="button"
      className="lib-press theory-hover-card cursor-pointer select-none rounded-2xl border transition-colors duration-200 focus-visible:outline-none"
      style={{
        borderColor: abierta ? L.primary + "66" : L.line,
        backgroundColor: abierta ? L.primary + "0c" : L.surface,
        boxShadow: abierta ? cardShadow : "none",
      }}
      onClick={toggle}
      aria-expanded={abierta}
      aria-label={topico.nombre}
    >
      {!abierta ? (
        <div className="p-4 min-h-[90px] flex flex-col justify-between gap-2">
          <div className="text-sm font-semibold leading-snug" style={headingStyle}>
            {topico.nombre}
          </div>
          <div className="text-[11px] italic" style={{ color: L.muted }}>
            {topico.traduccion}
          </div>
          <div className="mt-1 text-[10px] font-semibold" style={{ ...fontMono, color: L.primary }}>
            {isEN ? "Click to expand" : "Clic para ver"}
          </div>
        </div>
      ) : (
        <div className="p-4 space-y-2.5">
          <div className="flex items-start justify-between gap-2">
            <div>
              <div className="text-sm font-semibold leading-snug" style={headingStyle}>
                {topico.nombre}
              </div>
              <div className="text-[11px] italic" style={{ color: L.muted }}>
                {topico.traduccion}
              </div>
            </div>
            <span
              className="mt-0.5 shrink-0 rounded-lg px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.08em]"
              style={{ ...fontMono, color: L.primary }}
            >
              {isEN ? "close ✕" : "cerrar ✕"}
            </span>
          </div>
          <p className="text-xs leading-relaxed" style={{ color: L.ink }}>
            {topico.explicacion}
          </p>
          <p className="text-xs leading-relaxed" style={{ color: L.muted }}>
            <span className="font-medium" style={{ color: L.ink }}>
              {isEN ? "Example: " : "Ejemplo: "}
            </span>
            {topico.ejemplo}
          </p>
          <p className="text-xs leading-relaxed" style={{ color: L.muted }}>
            <span className="font-medium" style={{ color: L.ink }}>
              {isEN ? "How to recognize it: " : "Cómo reconocerlo: "}
            </span>
            {topico.pistas}
          </p>
          <div
            className="rounded-xl border p-3 text-xs"
            style={{ backgroundColor: L.primary + "0c", borderColor: L.primary + "2f" }}
          >
            <span className="font-medium" style={{ color: L.primary }}>
              {isEN ? "In IB analysis: " : "En el análisis IB: "}
            </span>
            <span style={{ color: L.ink }}>{topico.ib}</span>
          </div>
        </div>
      )}
    </button>
  );
}

// ── CONTENIDOS ───────────────────────────────────────────────

function contenidoMovimientos(isEN?: boolean) {
  if (isEN) return contenidoMovimientosEN();
  return (
    <div className="space-y-5">
      <p className="text-sm text-foreground/80 leading-relaxed">
        Conocer el movimiento literario de un texto no es un dato de erudición: ayuda a entender qué
        valores, qué visión del mundo y qué recursos formales son típicos de ese autor, y por qué
        hace las elecciones que hace.
      </p>

      <H3>Romanticismo (s. XIX)</H3>
      <Def titulo="Autores representativos">
        Bécquer, Zorrilla, Espronceda, Gertrudis Gómez de Avellaneda
      </Def>
      <p className="text-sm text-foreground/80 leading-relaxed mt-2">
        El Romanticismo reacciona contra la razón ilustrada exaltando el <strong>yo</strong>, la
        emoción y la libertad. Sus temas: amor imposible o truncado, muerte, naturaleza como espejo
        del estado de ánimo, rebeldía individual, nostalgia y melancolía. En lo formal: lenguaje
        emotivo, exclamaciones, interrogaciones retóricas, imágenes de ruinas, noche y tormenta.
      </p>

      <H3>Modernismo (1888–1920)</H3>
      <Def titulo="Autores representativos">
        Rubén Darío, José Martí, Leopoldo Lugones, Amado Nervo
      </Def>
      <p className="text-sm text-foreground/80 leading-relaxed mt-2">
        El Modernismo busca renovar la lengua literaria desde el esteticismo: el lenguaje es un
        objeto bello en sí mismo. Influenciado por el Simbolismo francés (Baudelaire, Verlaine). Sus
        características: musicalidad, sinestesias, vocabulario exótico o culto, escapismo hacia
        mundos lejanos o mitológicos, y una crítica implícita al materialismo de la sociedad
        burguesa.
      </p>

      <H3>Generación del 98 (España)</H3>
      <Def titulo="Autores representativos">
        Miguel de Unamuno, Antonio Machado, Pío Baroja, Valle-Inclán
      </Def>
      <p className="text-sm text-foreground/80 leading-relaxed mt-2">
        Surge a raíz de la crisis de 1898 (pérdida de las últimas colonias españolas). Reflexionan
        sobre la identidad de España, el sentido de la existencia y la angustia espiritual. Estilo
        austero y directo, alejado del ornamentalismo modernista.
      </p>

      <H3>Vanguardismo (1920–1940)</H3>
      <Def titulo="Autores representativos">
        César Vallejo, Vicente Huidobro, Rafael Alberti, Pablo Neruda (primera época)
      </Def>
      <p className="text-sm text-foreground/80 leading-relaxed mt-2">
        Las vanguardias (ultraísmo, creacionismo, surrealismo) rompen con las normas establecidas:
        imagen irracional, supresión de la puntuación, tipografía experimental, libre asociación. El
        Surrealismo influye especialmente en la poesía hispánica: imágenes oníricas, el inconsciente
        como fuente creativa.
      </p>

      <H3>Generación del 27 (España)</H3>
      <Def titulo="Autores representativos">
        Federico García Lorca, Rafael Alberti, Jorge Guillén, Pedro Salinas, Luis Cernuda
      </Def>
      <p className="text-sm text-foreground/80 leading-relaxed mt-2">
        Síntesis entre tradición (Góngora, el romance popular) y vanguardia (imagen surrealista).
        Cultivan desde la poesía pura (Guillén) hasta el neopopularismo lorquiano. La Guerra Civil
        (1936) marca el fin del grupo: exilio, muerte (Lorca), silencio.
      </p>

      <H3>Boom latinoamericano (1960–1980)</H3>
      <Def titulo="Autores representativos">
        Gabriel García Márquez, Julio Cortázar, Mario Vargas Llosa, Carlos Fuentes
      </Def>
      <p className="text-sm text-foreground/80 leading-relaxed mt-2">
        El Boom internacionaliza la narrativa latinoamericana. Experimentación formal: tiempo no
        lineal, múltiples narradores, monólogo interior. El <strong>realismo mágico</strong> (García
        Márquez, Rulfo) integra lo sobrenatural en la realidad cotidiana sin asombro: lo maravilloso
        y lo ordinario coexisten sin contradicción.
      </p>

      <TipIB>
        En la Prueba 1 no necesitas saber la fecha exacta de un movimiento, pero sí reconocer sus
        características cuando aparecen en el texto. Si un poema tiene imágenes irracionales y
        ruptura sintáctica, probablemente es vanguardismo; si tiene musicalidad exuberante y
        esteticismo, modernismo.
      </TipIB>
    </div>
  );
}

function contenidoPoesia(isEN?: boolean) {
  if (isEN) return contenidoPoesiaEN();
  return (
    <div className="space-y-5">
      <p className="text-sm text-foreground/80 leading-relaxed">
        La poesía es el género donde la forma y el contenido están más íntimamente ligados. Analizar
        un poema sin atender a su forma —ritmo, rima, disposición de los versos— es analizar solo la
        mitad del texto.
      </p>

      <H3>El hablante lírico</H3>
      <Def titulo="Concepto clave">
        El <strong>hablante lírico</strong> es la voz que habla en el poema. No es el autor. Neruda
        construye un hablante lírico en el Poema XX; ese hablante no es idéntico a Neruda, aunque
        comparta experiencias.
      </Def>
      <p className="text-sm text-foreground/80 leading-relaxed mt-2">
        En la Prueba 1, nunca escribas «Neruda dice que...» o «Lorca siente...». Di siempre «el
        hablante lírico», «la voz poética» o «el yo lírico». Esta distinción es fundamental en la
        valoración del IB: demuestra que entiendes que el poema es una construcción literaria, no
        una confesión autobiográfica directa.
      </p>

      <H3>Terminología equivalente</H3>
      <Tabla
        cabeceras={["Término", "Cuándo usarlo", "Nota"]}
        filas={[
          ["Hablante lírico", "Siempre. Término neutro y académico.", "Recomendado en la Prueba 1"],
          [
            "Yo poético / Yo lírico",
            "Cuando la voz habla en 1.ª persona explícita.",
            "«Yo soy un hombre sincero…»",
          ],
          [
            "Voz poética / Voz lírica",
            "Equivalente a hablante lírico; énfasis en la enunciación.",
            "Intercambiable con hablante lírico",
          ],
          [
            "Tú poético / Tú lírico",
            "El destinatario al que el hablante se dirige en el poema.",
            "«No te muevas, no respires…» (Paz)",
          ],
        ]}
      />

      <H3>Tono y temple de ánimo</H3>
      <p className="text-sm text-foreground/80 leading-relaxed">
        El <strong>tono</strong> es la actitud del hablante lírico ante el tema: nostálgico,
        irónico, exaltado, melancólico, desafiante, íntimo, solemne. El{" "}
        <strong>temple de ánimo</strong> es el estado emocional general que transmite el poema al
        lector. Ambos se construyen a través de los recursos léxicos y formales, no son datos
        externos al texto.
      </p>

      <H3>Cómputo silábico</H3>
      <div className="space-y-3">
        <Def titulo="Sinalefa">
          Cuando una palabra termina en vocal y la siguiente empieza en vocal (o h muda), las dos
          vocales se cuentan como una sola sílaba. <em>«la es-tre-lla a-pa-re-ce»</em> → la sinalefa
          une «lla» y «a».
        </Def>
        <Def titulo="Acento final del verso">
          Si el último acento cae en sílaba <strong>aguda</strong> (oxítona), se suma 1. Si cae en
          sílaba <strong>esdrújula</strong> (proparoxítona), se resta 1. Si es{" "}
          <strong>llana</strong> (lo más habitual), el recuento no varía.
        </Def>
      </div>

      <H3>Versos isosilábicos y anisosilábicos</H3>
      <div className="space-y-3">
        <Def titulo="Isosilábico">
          Todos los versos tienen el mismo número de sílabas. Es la norma de la poesía clásica
          española (soneto, lira, décima…). Crea un ritmo regular y previsible.{" "}
          <em>«Cerrar podrá mis ojos la postrera»</em> /{" "}
          <em>«sombra que me llevare el blanco día»</em> — ambos endecasílabos (11 sílabas).
        </Def>
        <Def titulo="Anisosilábico">
          Los versos tienen distinto número de sílabas. Característico del verso libre y de
          variantes modernas. El contenido dicta la longitud del verso; produce un ritmo variable y
          menos predecible. <em>«Puedo escribir los versos más tristes esta noche»</em> — verso
          libre, sin medida fija.
        </Def>
      </div>

      <H3>Tipos de verso más frecuentes en el IB</H3>
      <Tabla
        cabeceras={["Nombre", "Sílabas", "Arte", "Uso habitual"]}
        filas={[
          ["Octosílabo", "8", "Menor", "Romance, poesía popular, teatro del Siglo de Oro"],
          [
            "Endecasílabo",
            "11",
            "Mayor",
            "Soneto, silva, lira. Tradición italianizante desde el Renacimiento.",
          ],
          [
            "Alejandrino",
            "14 (7+7)",
            "Mayor",
            "Modernismo (Darío), épica medieval. Cesura central obligatoria.",
          ],
          ["Verso libre", "Variable", "—", "Poesía contemporánea, Neruda, vanguardismo."],
        ]}
      />

      <H3>Verso esticomítico y encabalgamiento</H3>
      <Def titulo="Verso esticomítico">
        La unidad sintáctica coincide exactamente con el verso: la oración o sintagma se cierra al
        final del verso sin desbordarse al siguiente. Produce un ritmo cortado y enfático; cada
        verso es autónomo semánticamente.{" "}
        <em>«Verde que te quiero verde. / Verde viento. Verdes ramas.»</em> — cada verso es una
        unidad cerrada (Lorca, «Romance sonámbulo»).
      </Def>
      <Def titulo="Encabalgamiento">
        La oración o sintagma comenzado en un verso continúa en el siguiente, rompiendo la pausa
        métrica esperada. Crea tensión entre el ritmo del verso y el flujo del sentido; el lector
        queda en suspenso al final del verso encabalgante.
      </Def>
      <Tabla
        cabeceras={["Tipo", "Definición", "Ejemplo"]}
        filas={[
          [
            "Suave",
            "La pausa sintáctica llega tarde en el verso siguiente (el elemento montado es largo). El desbordamiento se percibe con suavidad.",
            "«Cerrar podrá mis ojos la postrera / sombra que me llevare el blanco día» (Quevedo)",
          ],
          [
            "Abrupto",
            "La pausa llega muy pronto en el verso siguiente (el elemento montado es muy corto). Produce un corte brusco y enfático.",
            "«La luna vino a la fragua / con su polisón de nardos.» (Lorca)",
          ],
          [
            "Sirremático",
            "La ruptura separa dos elementos de un mismo sintagma (artículo + sustantivo, adjetivo + sustantivo…). Forma más frecuente en la poesía clásica.",
            "«…y podrá desatar esta alma / mía» — «esta alma» separado de «mía» (Quevedo)",
          ],
        ]}
      />

      <H3>Tipos de rima</H3>
      <div className="space-y-3">
        <Def titulo="Rima consonante">
          Coinciden todos los sonidos a partir de la última vocal acentuada.{" "}
          <em>«noche / derroche»</em> → consonante. Más estricta; mayor sensación de cierre formal.
        </Def>
        <Def titulo="Rima asonante">
          Solo coinciden las <strong>vocales</strong> a partir de la última vocal acentuada.{" "}
          <em>«golondrinas / vida»</em> → asonante en i-a. El romance usa rima asonante: suena más
          natural y popular.
        </Def>
        <Def titulo="Verso blanco">
          Métrica fija pero sin rima. Frecuente en el teatro del Siglo de Oro y en la poesía
          neoclásica.
        </Def>
        <Def titulo="Verso libre">
          Sin métrica fija <strong>ni</strong> rima. El ritmo surge de la sintaxis, las imágenes y
          la disposición tipográfica.
        </Def>
      </div>

      <H3>El soneto</H3>
      <p className="text-sm text-foreground/80 leading-relaxed">
        Forma estrófica de <strong>14 versos endecasílabos</strong> distribuidos en dos cuartetos
        (ABBA ABBA) y dos tercetos (CDC DCD o variantes). Estructura argumentativa tripartita:
        planteamiento (cuartetos) → desarrollo → síntesis o <em>volta</em> (tercetos). El verso
        final suele ser el más denso semánticamente.
      </p>
      <div className="p-4 rounded-lg border border-border bg-muted/30 mt-2">
        <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground mb-2">
          Ejemplo completo
        </div>
        <pre className="font-serif text-sm text-ink leading-relaxed whitespace-pre-wrap">{`Cerrar podrá mis ojos la postrera  (A)
sombra que me llevare el blanco día,  (B)
y podrá desatar esta alma mía  (B)
hora a su afán ansioso lisonjera;  (A)

mas no, de esotra parte, en la ribera,  (A)
dejará la memoria, en donde ardía;  (B)
nadar sabe mi llama el agua fría,  (B)
y perder el respeto a ley severa.  (A)

Alma a quien todo un dios prisión ha sido,  (C)
venas que humor a tanto fuego han dado,  (D)
médulas que han gloriosamente ardido,  (C)

su cuerpo dejará, no su cuidado;  (D)
serán ceniza, mas tendrán sentido;  (C)
polvo serán, mas polvo enamorado.  (D)`}</pre>
        <p className="text-xs text-muted-foreground mt-2">
          — Francisco de Quevedo, «Amor constante más allá de la muerte» (s. XVII)
        </p>
        <p className="text-xs text-foreground/70 mt-1.5 leading-relaxed">
          La <em>volta</em> está en «mas no» (v. 5): el hablante acepta la muerte del cuerpo pero
          niega la del amor. El verso final concentra la paradoja central del poema.
        </p>
      </div>

      <H3>El romance</H3>
      <p className="text-sm text-foreground/80 leading-relaxed">
        Serie indefinida de <strong>octosílabos</strong> con{" "}
        <strong>rima asonante en los versos pares</strong>; los impares quedan libres. Forma de raíz
        oral y popular fijada en la tradición española desde la Edad Media. En el s. XX, Lorca la
        recupera en el <em>Romancero gitano</em> dotándola de un lirismo y un simbolismo modernos.
      </p>
      <div className="p-4 rounded-lg border border-border bg-muted/30 mt-2">
        <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground mb-2">
          Ejemplo
        </div>
        <pre className="font-serif text-sm text-ink leading-relaxed whitespace-pre-wrap">{`Abenámar, Abenámar,  (-)
moro de la morería,  (a)
el día que tú naciste  (-)
grandes señales había.  (a)
Estaba la mar en calma,  (-)
la luna estaba crecida,  (a)
moro que en tal signo nace  (-)
no debe decir mentira.  (a)`}</pre>
        <p className="text-xs text-muted-foreground mt-2">
          — «Romance de Abenámar» (anónimo medieval). Rima asonante en -ía.
        </p>
        <p className="text-xs text-foreground/70 mt-1.5 leading-relaxed">
          Observa el diálogo directo, el inicio in medias res y el final abierto: marcas narrativas
          características del romance.
        </p>
      </div>

      <H3>Principales géneros poéticos</H3>
      <Tabla
        cabeceras={["Género", "Características", "Ejemplo"]}
        filas={[
          [
            "Soneto",
            "14 versos endecasílabos: dos cuartetos + dos tercetos. Estructura argumentativa.",
            "Quevedo, Garcilaso (ss. XVI-XVII)",
          ],
          [
            "Romance",
            "Serie indefinida de octosílabos con rima asonante en los pares.",
            "Romancero gitano de Lorca",
          ],
          [
            "Oda",
            "Poema de tono elevado, generalmente de alabanza o reflexión. Estrofas largas.",
            "Odas elementales de Neruda",
          ],
          [
            "Elegía",
            "Poema de lamento por una pérdida (muerte, amor, patria). Tono melancólico.",
            "Coplas de Manrique, Rima LIII de Bécquer",
          ],
          [
            "Verso libre",
            "Sin métrica fija ni rima. El ritmo surge de la sintaxis y la imagen.",
            "Neruda tardío, poesía contemporánea",
          ],
        ]}
      />

      <TipIB>
        Cuando analices un poema, menciona el tipo de verso y la rima en la introducción y conecta
        esa elección formal con el tono y el tema. Un endecasílabo en soneto trae consigo toda la
        tradición renacentista y barroca; el octosílabo del romance, el peso de la poesía popular.
        Recuerda además: en poesía, la voz es siempre «el hablante lírico» —nunca «el poeta» o el
        nombre del autor.
      </TipIB>
    </div>
  );
}

function contenidoNarratologia(isEN?: boolean) {
  if (isEN) return contenidoNarratologiaEN();
  return (
    <div className="space-y-5">
      <p className="text-sm text-foreground/80 leading-relaxed">
        La narratología es la disciplina que estudia la estructura y el funcionamiento de los
        relatos. Distingue entre <strong>qué</strong> se cuenta (historia) y <strong>cómo</strong>{" "}
        se cuenta (discurso). Dominar esta distinción es clave para el análisis de prosa en la
        Prueba 1.
      </p>

      {/* 1. Historia vs Discurso */}
      <H3>Historia y discurso</H3>
      <div className="space-y-3">
        <Def titulo="Historia (fábula)">
          La secuencia lógica y cronológica de los acontecimientos tal como habrían ocurrido en la
          realidad. Es el «qué»: los hechos en su orden natural.
        </Def>
        <Def titulo="Discurso (sujeto)">
          La manera en que esos hechos son presentados al lector: el orden elegido, el ritmo, el
          punto de vista, los recursos. Es el «cómo»: la construcción artística del relato.
        </Def>
      </div>
      <p className="text-sm text-foreground/80 leading-relaxed">
        Un mismo conjunto de hechos puede contarse de formas radicalmente distintas. El análisis
        narratológico consiste en comparar la historia con el discurso: ¿por qué el autor eligió
        empezar por el final? ¿Por qué omitió ciertos datos? ¿Qué efecto produce ese orden?
      </p>

      {/* 2. Narrador, narratario, pacto ficcional */}
      <H3>Narrador, narratario y pacto ficcional</H3>
      <div className="space-y-3">
        <Def titulo="Narrador">
          Instancia textual que cuenta la historia. No es el autor: es una voz construida por el
          texto. Puede ser fiable o no fiable, cercano o distante, omnisciente o limitado.
        </Def>
        <Def titulo="Narratario">
          El receptor implícito al que se dirige el narrador dentro del texto. No es el lector real,
          sino una figura construida: «tú, lector» en Cervantes, el jurado en una novela epistolar,
          etc. Identificar el narratario revela mucho sobre el tono y la estrategia retórica.
        </Def>
        <Def titulo="Pacto ficcional (verosimilitud)">
          Acuerdo tácito entre texto y lector: aceptamos las convenciones del mundo narrado. El
          narrador omnisciente que conoce los pensamientos íntimos de todos los personajes es
          inverosímil en la vida real, pero el pacto ficcional lo hace aceptable. Cuando un texto
          rompe ese pacto deliberadamente (metaficción, narrador no fiable) el efecto es
          desconcertante o revelador.
        </Def>
      </div>

      {/* 3. La acción */}
      <H3>La acción: estructura y técnicas</H3>
      <div className="space-y-3">
        <Def titulo="In medias res">
          El relato comienza en mitad de la acción, sin introducción previa. Obliga al lector a
          reconstruir el contexto y crea inmersión inmediata.
        </Def>
        <Def titulo="In extrema res">
          El relato comienza directamente en el desenlace o en el punto de mayor tensión. Genera
          expectativa invertida: sabemos el resultado, pero no cómo se llegó a él.
        </Def>
        <Def titulo="Final abierto">
          El texto termina sin resolver la tensión central. El lector debe completar el significado.
          Efecto: ambigüedad, invitación a la interpretación, mímesis de la vida real.
        </Def>
        <Def titulo="Digresión">
          Interrupción del hilo narrativo para incluir reflexiones, descripciones o historias
          secundarias. Puede ser decorativa, simbólica o funcionalmente retardataria (dilata el
          clímax).
        </Def>
        <Def titulo="Contrapunto">
          Alternancia entre dos o más líneas narrativas simultáneas que se iluminan mutuamente por
          contraste o paralelismo. Técnica cinematográfica adaptada a la prosa.
        </Def>
      </div>

      {/* 4. La descripción */}
      <H3>La descripción</H3>
      <div className="space-y-3">
        <Def titulo="Prosopografía">
          Descripción del aspecto físico de un personaje: rasgos, complexión, ropa, gestos. En el
          IB, analiza qué selecciona el narrador y por qué: cada detalle físico puede ser simbólico.
        </Def>
        <Def titulo="Etopeya">
          Descripción del carácter, valores, comportamientos y mundo interior de un personaje. A
          menudo más reveladora que la prosopografía: muestra al personaje en acción o en
          pensamiento.
        </Def>
      </div>
      <p className="text-sm text-foreground/80 leading-relaxed">
        Las descripciones cumplen cuatro funciones narrativas:
      </p>
      <Tabla
        cabeceras={["Función", "Qué hace", "Efecto"]}
        filas={[
          [
            "Dilatoria",
            "Detiene el avance de la acción para describir",
            "Crea suspense, retarda el clímax, da tiempo al lector para situarse",
          ],
          [
            "Demarcativa",
            "Marca un cambio de escena, tiempo o perspectiva",
            "Señaliza transiciones; organiza la estructura del relato",
          ],
          [
            "Simbólica",
            "El objeto o lugar descrito representa algo más",
            "Condensa significado; convierte detalles en metáforas del tema",
          ],
          [
            "Decorativa",
            "Ambienta sin función estructural directa",
            "Crea atmósfera, verosimilitud, placer estético",
          ],
        ]}
      />

      {/* 5. El tiempo narrativo */}
      <H3>El tiempo narrativo</H3>
      <div className="space-y-3">
        <Def titulo="Tiempo externo">
          El periodo histórico en que se sitúa la historia (época, año, contexto sociopolítico).
          Puede ser explícito («Madrid, 1936») o reconstruible por referencias culturales.
        </Def>
        <Def titulo="Tiempo interno">
          La duración y organización interna del relato: cuánto tiempo abarca, cómo se distribuye
          esa duración a lo largo del texto, qué momentos se dilatan y cuáles se comprimen.
        </Def>
      </div>
      <p className="text-sm text-foreground/80 leading-relaxed font-medium">
        Anacronías (alteraciones del orden cronológico):
      </p>
      <div className="space-y-3">
        <Def titulo="Analepsis (flashback)">
          El relato retrocede al pasado para narrar algo anterior al presente de la historia.
          Efecto: explicar el origen de un conflicto, contrastar pasado y presente, revelar
          información retenida para crear suspense.
        </Def>
        <Def titulo="Prolepsis (flashforward)">
          El relato anticipa eventos futuros. Ejemplo canónico: el incipit de{" "}
          <em>Cien años de soledad</em> («Muchos años después, frente al pelotón de fusilamiento…»).
          Efecto: instala la fatalidad desde el inicio; el lector sabe el destino pero no el camino.
        </Def>
      </div>
      <p className="text-sm text-foreground/80 leading-relaxed font-medium mt-3">
        Anisocronías (ritmo narrativo): relación entre tiempo de la historia y espacio del texto
      </p>
      <Tabla
        cabeceras={["Modalidad", "Definición", "Efecto típico"]}
        filas={[
          [
            "Escena",
            "El tiempo de la historia y el del discurso son equivalentes (diálogos, acción directa)",
            "Inmersión; el lector vive los hechos en tiempo real",
          ],
          [
            "Resumen",
            "Se condensan años en pocas líneas",
            "Acelera la narración; salta lo irrelevante; da perspectiva temporal amplia",
          ],
          [
            "Pausa",
            "La acción se detiene para una descripción o reflexión",
            "Enfatiza un elemento; crea atmósfera; dilata el tiempo",
          ],
          [
            "Elipsis",
            "Se omite un periodo sin mencionarlo",
            "El lector debe inferir qué pasó; puede crear misterio o agilizar el ritmo",
          ],
          [
            "Paralipsis",
            "Se omite deliberadamente información relevante que debería haberse dado",
            "Narrador no fiable o estratégicamente selectivo; genera suspense o ambigüedad",
          ],
        ]}
      />

      {/* 6. El espacio */}
      <H3>El espacio narrativo</H3>
      <div className="space-y-3">
        <Def titulo="Espacio objetivo">
          El lugar tal como se describe de forma observable y concreta: «una habitación con paredes
          blancas, una sola ventana al este». El narrador no filtra emocionalmente.
        </Def>
        <Def titulo="Espacio subjetivo (espacio-reflejo)">
          El espacio filtrado por la conciencia o el estado emocional del personaje. El mismo cuarto
          puede ser «luminoso» para uno y «claustrofóbico» para otro. El espacio refleja la
          interioridad: analiza si el ambiente refuerza o contradice el estado del personaje.
        </Def>
        <Def titulo="Espacio-ambiente">
          El entorno que determina o condiciona la psicología de los personajes y el desarrollo de
          la acción. Recurso central del Naturalismo: el medio moldea al individuo.
        </Def>
      </div>
      <TipIB>
        Cuando analices el espacio, pregunta siempre: ¿qué representa este lugar más allá de su
        función literal? La casa de Cortázar es la trampa mental; el laberinto borgesiano es el
        tiempo o el pensamiento; Macondo es el origen del mundo. El espacio narrativo rara vez es
        neutro en los textos de calidad literaria.
      </TipIB>

      {/* 7. Los personajes */}
      <H3>Los personajes</H3>
      <p className="text-sm text-foreground/80 leading-relaxed">
        Los personajes se pueden clasificar según su presencia en el texto y según su complejidad:
      </p>
      <Tabla
        cabeceras={["Por aparición", "Descripción"]}
        filas={[
          ["Protagonista", "Centro de la acción; la historia gira en torno a él"],
          ["Antagonista", "Se opone al protagonista; genera el conflicto principal"],
          ["Personaje secundario", "Apoya o complica la trama; puede tener su propio arco"],
          ["Personaje episódico", "Aparece brevemente; función puntual o simbólica"],
          [
            "Personaje colectivo",
            "Un grupo que actúa como unidad (el pueblo, la familia, la masa)",
          ],
        ]}
      />
      <Tabla
        cabeceras={["Por caracterización (E.M. Forster)", "Descripción"]}
        filas={[
          [
            "Plano (flat)",
            "Definido por un solo rasgo dominante; predecible; sin evolución. Funciona como arquetipo o símbolo.",
          ],
          [
            "Redondo (round)",
            "Complejo, contradictorio, capaz de sorprender. Evoluciona a lo largo del relato. Mímesis psicológica.",
          ],
        ]}
      />
      <div className="space-y-3 mt-3">
        <Def titulo="Monólogo interior">
          Reproducción directa del flujo de pensamiento de un personaje, generalmente en primera
          persona y presente. Muestra la mente tal como piensa: sin filtro narrativo, con
          asociaciones libres. Ejemplo: Molly Bloom en <em>Ulises</em> de Joyce.
        </Def>
        <Def titulo="Corriente de conciencia (stream of consciousness)">
          Técnica narrativa más radical que el monólogo interior: reproduce el pensamiento
          fragmentado, prelingüístico, asociativo, incluyendo percepciones sensoriales y memoria
          involuntaria. La puntuación se vuelve convencional o desaparece. Efecto: máxima inmersión
          en la subjetividad del personaje.
        </Def>
      </div>
      <p className="text-sm text-foreground/80 leading-relaxed">
        Los atributos del personaje incluyen: nombre (¿significativo o neutro?), rasgos físicos
        (prosopografía), rasgos psicológicos (etopeya), función en la trama, relaciones con otros
        personajes y valor simbólico.
      </p>

      {/* 8. El narrador: punto de vista */}
      <H3>El narrador y el punto de vista</H3>
      <p className="text-sm text-foreground/80 leading-relaxed font-medium">
        Participación del narrador en la historia (Genette):
      </p>
      <Tabla
        cabeceras={["Tipo", "Definición", "Personas gramaticales"]}
        filas={[
          [
            "Heterodiegético",
            "El narrador no es personaje de la historia que cuenta. Externo, fuera de la fábula.",
            "3ª persona",
          ],
          [
            "Homodiegético",
            "El narrador participa en la historia que cuenta. Puede ser protagonista o testigo.",
            "1ª persona",
          ],
          [
            "Autodiegético",
            "Variante homodiegética: el narrador es el protagonista absoluto de su propio relato.",
            "1ª persona",
          ],
        ]}
      />
      <p className="text-sm text-foreground/80 leading-relaxed font-medium mt-3">
        Perspectiva temporal del narrador:
      </p>
      <div className="space-y-3">
        <Def titulo="Perspectiva actual (simultánea)">
          El narrador cuenta los hechos mientras ocurren. Efecto de inmediatez e incertidumbre; el
          narrador no sabe cómo terminará.
        </Def>
        <Def titulo="Perspectiva retrospectiva">
          El narrador cuenta desde después de los hechos, mirando hacia atrás. Puede haber ironía
          entre lo que el personaje creía entonces y lo que el narrador sabe ahora.
        </Def>
        <Def titulo="Perspectiva prospectiva">
          El narrador anticipa lo que va a ocurrir, proyectando desde el presente hacia el futuro.
          Crea expectativa y a veces fatalismo.
        </Def>
      </div>
      <p className="text-sm text-foreground/80 leading-relaxed font-medium mt-3">
        Focalización (Genette): quién percibe, no quién habla
      </p>
      <Tabla
        cabeceras={["Focalización", "Qué sabe / percibe", "Efecto"]}
        filas={[
          [
            "Cero (narrador omnisciente)",
            "Accede a todos los pensamientos, pasados y futuros de todos los personajes. «El narrador sabe más que cualquier personaje.»",
            "Autoridad total; sensación de orden y control; típico de la novela decimonónica",
          ],
          [
            "Interna fija",
            "Adopta la perspectiva de un único personaje durante todo el relato. Solo sabe lo que ese personaje sabe.",
            "Intimidad con un solo punto de vista; el lector comparte sus limitaciones y sesgos",
          ],
          [
            "Interna variable",
            "Adopta sucesivamente la perspectiva de diferentes personajes en distintas partes del texto.",
            "Visión polifónica; el lector compara perspectivas y construye una verdad más compleja",
          ],
          [
            "Externa (narrador objetivo)",
            "Solo registra lo observable: acciones, palabras, gestos. No accede a ninguna mente.",
            "Efecto documental o behaviorista; el lector debe inferir emociones e intenciones",
          ],
          [
            "Perspectivismo",
            "Variante de la focalización variable: la misma historia se narra desde puntos de vista opuestos que se contradicen.",
            "Relativismo epistémico; ninguna versión es «la verdad»; característico de Unamuno o Faulkner",
          ],
        ]}
      />
      <p className="text-sm text-foreground/80 leading-relaxed font-medium mt-3">
        Intervención del narrador en el discurso:
      </p>
      <div className="space-y-3">
        <Def titulo="Narrador subjetivo">
          Comenta, valora, juzga o ironiza sobre los hechos y personajes que narra. Su voz es
          visible y marca ideológicamente el relato.
        </Def>
        <Def titulo="Narrador objetivo (behaviorista)">
          Se limita a registrar hechos observables sin valorar ni interpretar. Semeja a una cámara o
          a un informe. El lector extrae sus propias conclusiones.
        </Def>
      </div>

      {/* 9. Estilos de discurso */}
      <H3>Estilos de reproducción del discurso</H3>
      <Tabla
        cabeceras={["Estilo", "Características", "Ejemplo"]}
        filas={[
          [
            "Directo",
            "Las palabras del personaje se reproducen literalmente, con marcas tipográficas (guion, comillas) y verbum dicendi.",
            "—Quiero marcharme —dijo Elena.",
          ],
          [
            "Indirecto",
            "El narrador reformula las palabras del personaje. Cambio de persona y tiempo verbal. Sin comillas.",
            "Elena dijo que quería marcharse.",
          ],
          [
            "Indirecto libre",
            "Las palabras o pensamientos del personaje se integran en la voz del narrador sin verbum dicendi ni marca tipográfica. Fusión de voces.",
            "¿Para qué quedarse? No había nada que la retuviera allí.",
          ],
        ]}
      />
      <p className="text-sm text-foreground/80 leading-relaxed">
        El <strong>estilo indirecto libre</strong> es el más sofisticado y el más frecuente en la
        narrativa moderna. Su efecto principal es la ambigüedad: no siempre está claro si quien
        habla es el narrador o el personaje. Identificarlo en un fragmento y explicar qué efecto
        produce es una respuesta de nivel IB.
      </p>

      {/* 10. Aspectos lingüísticos */}
      <H3>Aspectos lingüísticos del discurso narrativo</H3>
      <div className="space-y-3">
        <Def titulo="Hipotaxis">
          Construcción sintáctica subordinada: oraciones complejas encadenadas con conectores
          (porque, aunque, cuando, si bien…). Refleja pensamiento elaborado, causalidad, matiz.
          Típica del Realismo y la prosa intelectual.
        </Def>
        <Def titulo="Parataxis">
          Construcción sintáctica coordinada o yuxtapuesta: oraciones breves, pocas subordinadas,
          ritmo cortado. Crea inmediatez, urgencia o sencillez. Típica de Hemingway, el minimalismo
          y ciertos narradores no sofisticados.
        </Def>
      </div>
      <p className="text-sm text-foreground/80 leading-relaxed font-medium">
        Tiempos verbales y su función narrativa:
      </p>
      <Tabla
        cabeceras={["Tiempo verbal", "Uso narrativo", "Efecto"]}
        filas={[
          [
            "Pretérito indefinido (canté)",
            "Acción pasada concluida; tiempo base del relato",
            "Avance de la acción; distancia temporal respecto al narrador",
          ],
          [
            "Pretérito imperfecto (cantaba)",
            "Acción pasada durativa, habitual o de trasfondo",
            "Descripción, atmósfera, estado permanente; ralentiza la narración",
          ],
          [
            "Presente histórico (canta)",
            "Hechos pasados narrados en presente",
            "Vivacidad, inmediatez, dramatismo; aproxima el pasado al lector",
          ],
          [
            "Pluscuamperfecto (había cantado)",
            "Anterioridad respecto a otro tiempo pasado",
            "Marca analepsis; señala la anterioridad cronológica",
          ],
        ]}
      />

      <TipIB>
        En la Prueba 1, el análisis del narrador es uno de los elementos más valorados en el
        criterio B (Técnica y estructura). No basta con nombrar el tipo de narrador: hay que
        explicar qué efecto produce, qué información retiene o revela, y cómo esa elección refuerza
        el tema o el tono del fragmento. Relaciona siempre focalización, estilo de discurso y tiempo
        verbal como un sistema coherente de decisiones del autor.
      </TipIB>
    </div>
  );
}

function contenidoTeatro(isEN?: boolean) {
  if (isEN) return contenidoTeatroEN();
  return (
    <div className="space-y-5">
      <p className="text-sm text-foreground/80 leading-relaxed">
        El teatro es el género más complejo de analizar en la Prueba 1 porque el texto no es el
        producto final: es un guion para ser representado. Hay una dimensión visual, espacial y
        sonora que el análisis debe tener en cuenta incluso cuando solo se lee.
      </p>

      <H3>Orígenes: las fiestas dionisíacas</H3>
      <p className="text-sm text-foreground/80 leading-relaxed">
        El teatro occidental nace en la Grecia antigua como ritual religioso en honor a{" "}
        <strong>Dioniso</strong>, dios del vino, la fertilidad y el éxtasis. Las dos grandes
        festividades eran las <strong>Leneas</strong> (invierno, competiciones de comedia) y las{" "}
        <strong>Grandes Dionisias</strong> (primavera, competiciones de tragedia). En estos
        festivales cívicos se presentaban obras ante toda la ciudad; asistir era un acto político y
        religioso, no solo de entretenimiento.
      </p>
      <p className="text-sm text-foreground/80 leading-relaxed mt-2">
        El origen formal del teatro se atribuye a <strong>Tespis</strong> (s. VI a.C.), que separó a
        un actor del coro para crear el diálogo. Antes existía el <strong>ditirambo</strong>: un
        himno coral cantado y bailado en honor a Dioniso, del que surgieron los primeros
        intercambios dramáticos. El <strong>coro</strong> siguió siendo esencial en la tragedia
        griega: comentaba la acción, representaba la voz de la comunidad y enlazaba los episodios
        con sus odas.
      </p>

      <H3>
        Aristóteles y la <em>Poética</em>
      </H3>
      <p className="text-sm text-foreground/80 leading-relaxed">
        En su <em>Poética</em> (s. IV a.C.), Aristóteles sistematizó el teatro griego y ofreció las
        primeras categorías analíticas de la literatura occidental. Su influencia llega hasta hoy:
        conceptos como <em>catarsis</em>, <em>hamartia</em> y los seis elementos de la tragedia son
        vocabulario activo del análisis literario.
      </p>

      <H3>Definición de tragedia (Aristóteles)</H3>
      <div className="p-4 rounded-lg border border-border bg-muted/30">
        <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground mb-2">
          Definición de la <em>Poética</em> (libro VI)
        </div>
        <p className="font-serif text-sm text-ink leading-relaxed italic">
          «La tragedia es la imitación de una acción noble, completa y de cierta magnitud, en un
          lenguaje embellecido, con personajes que actúan y no mediante narración, y que a través de
          la compasión y el terror provoca la catarsis de tales pasiones.»
        </p>
      </div>
      <p className="text-sm text-foreground/80 leading-relaxed mt-2">
        Cuatro ideas clave en esta definición: (1) <strong>imitación</strong> (<em>mímesis</em>): el
        teatro representa la acción humana, no la reproduce literalmente; (2){" "}
        <strong>noble y completa</strong>: acción de cierta grandeza con principio, nudo y
        desenlace; (3) <strong>actuada</strong>: los personajes actúan, no narran; (4){" "}
        <strong>catarsis</strong>: la obra purga emocionalmente al espectador.
      </p>

      <H3>Los seis elementos de la tragedia</H3>
      <Tabla
        cabeceras={["Elemento (griego)", "Traducción", "Función"]}
        filas={[
          [
            "Mythos",
            "Trama / fábula",
            "La construcción de los hechos. El más importante según Aristóteles: «el alma de la tragedia».",
          ],
          [
            "Ethos",
            "Carácter",
            "Las disposiciones morales de los personajes; lo que revela sus elecciones y su naturaleza.",
          ],
          [
            "Dianoia",
            "Pensamiento / ideas",
            "Los argumentos y reflexiones expresados en los discursos de los personajes.",
          ],
          [
            "Lexis",
            "Elocución / lenguaje",
            "La expresión verbal: elección de palabras, estilo, ritmo del diálogo.",
          ],
          [
            "Melos",
            "Melodía / canto",
            "El elemento musical y coral. En el teatro griego, el coro cantaba entre episodios.",
          ],
          [
            "Opsis",
            "Espectáculo",
            "Lo visual y escenográfico. Aristóteles lo consideraba el menos importante artísticamente.",
          ],
        ]}
      />
      <div className="space-y-3 mt-3">
        <Def titulo="Hamartia">
          El error de juicio o falla trágica que desencadena la caída del protagonista. No es
          simplemente un defecto moral: es una equivocación —a veces producto de la hybris
          (soberbia), a veces de la ignorancia— que desata una cadena de consecuencias inevitables.
          Ejemplo: la soberbia y la terquedad de Edipo; la ambición de Macbeth.
        </Def>
        <Def titulo="Catarsis">
          La purga o purificación emocional que experimenta el espectador ante el terror y la
          compasión que provoca la tragedia. Al identificarse con el héroe que cae, el espectador
          descarga sus propias emociones reprimidas y sale emocionalmente liberado. Es el fin último
          de la tragedia para Aristóteles.
        </Def>
        <Def titulo="Hybris">
          La soberbia o desmesura del héroe trágico: el exceso de orgullo que lo lleva a desafiar el
          orden divino o natural. La hybris suele provocar la nemesis (castigo divino o del
          destino). Es una de las formas más frecuentes de hamartia.
        </Def>
      </div>

      <H3>La regla de las tres unidades</H3>
      <p className="text-sm text-foreground/80 leading-relaxed">
        Sistematizada por los humanistas italianos del Renacimiento a partir de la <em>Poética</em>{" "}
        de Aristóteles, y adoptada como norma del teatro clásico francés (Racine, Corneille).
        Establece que una obra de teatro debe respetar:
      </p>
      <div className="space-y-3 mt-2">
        <Def titulo="Unidad de acción">
          Una sola trama principal, sin subtramas que la distraigan. Aristóteles la menciona
          explícitamente: la fábula debe ser «una y entera». Es la única unidad que él consideró
          obligatoria.
        </Def>
        <Def titulo="Unidad de tiempo">
          La acción dramática no debe superar las 24 horas. Los humanistas dedujeron esta norma de
          una observación de Aristóteles, aunque él no la prescribió estrictamente.
        </Def>
        <Def titulo="Unidad de lugar">
          La acción ocurre en un único espacio. Esta unidad es la más artificial: no aparece en
          Aristóteles; fue añadida por los teóricos renacentistas. El teatro isabelino y el español
          del Siglo de Oro la ignoraron deliberadamente.
        </Def>
      </div>

      <H3>
        El <em>Arte nuevo de hacer comedias</em> (Lope de Vega, 1609)
      </H3>
      <p className="text-sm text-foreground/80 leading-relaxed">
        En este poema-manifiesto de 389 endecasílabos, Lope de Vega justifica —con ironía y lucidez—
        su ruptura con las reglas clásicas y define la fórmula de la <strong>comedia nueva</strong>{" "}
        española que dominaría el teatro barroco durante dos siglos.
      </p>
      <div className="space-y-2 mt-3">
        {[
          {
            t: "Ruptura con las tres unidades",
            d: "Lope rechaza las unidades de tiempo y lugar por artificiales. La acción puede durar años y trasladarse de ciudad en ciudad si la fábula lo requiere.",
          },
          {
            t: "Mezcla de lo trágico y lo cómico",
            d: "«Lo trágico y lo cómico mezclado, / Terencio con Séneca». Los personajes nobles y los vulgares (el gracioso) conviven en la misma obra, reflejando la diversidad de la vida.",
          },
          {
            t: "Tres actos en vez de cinco",
            d: "Frente a los cinco actos de la tradición grecolatina, Lope propone tres: exposición, nudo y desenlace. Esta estructura se mantiene en el teatro occidental hasta hoy.",
          },
          {
            t: "Polimetría",
            d: "Cada momento dramático tiene su metro apropiado: el romance para la narración de hechos, las redondillas para el diálogo cotidiano, el soneto para los monólogos reflexivos, las décimas para el lamento.",
          },
          {
            t: "El vulgo como árbitro",
            d: "«Porque como las paga el vulgo, es justo / hablarle en necio para darle gusto.» Lope defiende que el teatro debe conectar con el público real, no solo con los eruditos.",
          },
          {
            t: "El honor como tema central",
            d: "Junto con el amor y la fe, el honor es el motor dramático del teatro áureo: su pérdida genera el conflicto y su recuperación (o imposibilidad) dicta el desenlace.",
          },
        ].map((item) => (
          <div key={item.t} className="p-3 rounded-md border border-border bg-card flex gap-3">
            <div>
              <span className="text-sm font-medium text-ink">{item.t}. </span>
              <span className="text-sm text-foreground/80">{item.d}</span>
            </div>
          </div>
        ))}
      </div>

      <H3>La ironía dramática</H3>
      <Def titulo="Definición">
        Situación en la que el espectador (o lector) sabe algo que uno o más personajes ignoran.
        Esta asimetría de información crea tensión, suspense o pathos: el público observa cómo el
        personaje actúa sin conocer una verdad que cambiará su destino.
      </Def>
      <p className="text-sm text-foreground/80 leading-relaxed mt-2">
        El ejemplo clásico es <em>Edipo Rey</em> de Sófocles: el espectador griego conocía el mito y
        sabía desde el principio que Edipo había matado a su padre y se había casado con su madre;
        toda la obra es una ironía dramática sostenida. En el teatro moderno, García Lorca usa la
        ironía dramática al mostrarnos la represión de la casa de Bernarda mientras el exterior late
        con vida: el espectador ve lo que los personajes no pueden ver o nombrar.
      </p>
      <div className="space-y-2 mt-2">
        {[
          {
            t: "Ironía dramática situacional",
            d: "El público sabe más que el personaje sobre los hechos. Crea suspense o pathos.",
          },
          {
            t: "Ironía dramática verbal",
            d: "Un personaje dice algo cuyo doble sentido el público entiende pero el personaje no. Frecuente en la comedia y en la tragedia shakespeariana.",
          },
          {
            t: "Ironía trágica",
            d: "El personaje avanza confiadamente hacia su propia destrucción sin saberlo. Intensifica la sensación de inevitabilidad y catarsis.",
          },
        ].map((item) => (
          <div key={item.t} className="flex gap-2 text-sm">
            <span className="font-medium text-ink min-w-[200px] shrink-0">{item.t}</span>
            <span className="text-foreground/75 leading-relaxed">{item.d}</span>
          </div>
        ))}
      </div>

      <H3>Estructura dramática</H3>
      <div className="space-y-1.5 text-sm">
        {[
          {
            t: "Acto",
            d: "Unidad mayor; equivale al capítulo en narrativa. Se separa por el descenso del telón o un cambio equivalente.",
          },
          {
            t: "Escena",
            d: "Subdivisión del acto; cambia cuando un personaje entra o sale del escenario.",
          },
          {
            t: "Cuadro",
            d: "División basada en el cambio de espacio o decorado, independientemente de los personajes.",
          },
        ].map((e) => (
          <div key={e.t} className="flex gap-2">
            <span className="font-medium text-ink min-w-[80px] shrink-0">{e.t}</span>
            <span className="text-foreground/75 leading-relaxed">{e.d}</span>
          </div>
        ))}
      </div>
      <div className="p-4 rounded-lg border border-border bg-muted/30 mt-2">
        <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground mb-2">
          Estructura interna clásica
        </div>
        <div className="space-y-1 text-sm">
          {[
            { t: "Exposición", d: "Presenta personajes, contexto y el conflicto inicial." },
            { t: "Nudo / desarrollo", d: "El conflicto se intensifica; surgen complicaciones." },
            { t: "Clímax", d: "Punto de máxima tensión dramática." },
            { t: "Desenlace", d: "Resolución del conflicto (trágica, cómica o ambigua)." },
          ].map((e) => (
            <div key={e.t} className="flex gap-2">
              <span className="font-medium text-ink min-w-[130px] shrink-0">{e.t}</span>
              <span className="text-foreground/75 leading-relaxed">{e.d}</span>
            </div>
          ))}
        </div>
      </div>

      <H3>Elementos del texto dramático</H3>
      <div className="space-y-3">
        <Def titulo="Acotaciones (didascalias)">
          Instrucciones del dramaturgo sobre el espacio, los gestos, el tono o la escenografía.
          Aparecen en cursiva o entre corchetes. En la Prueba 1 son tan analizables como los
          diálogos: revelan la intención del autor que los personajes no pueden expresar con
          palabras.
        </Def>
        <Def titulo="Diálogo">
          El intercambio de palabras entre dos o más personajes. El análisis debe atender tanto a lo
          que se dice como a lo que <em>no</em> se dice: los silencios, las evasiones y las
          interrupciones son significativos.
        </Def>
        <Def titulo="Monólogo">
          Un personaje habla durante un tiempo prolongado sin interrupciones. Puede dirigirse a
          personajes presentes, al público o a sí mismo.
        </Def>
        <Def titulo="Soliloquio">
          El personaje reflexiona en voz alta, generalmente solo en escena. El espectador accede a
          sus pensamientos íntimos. Equivalente dramático del monólogo interior en narrativa.
        </Def>
        <Def titulo="Aparte">
          El personaje dice algo al público que los otros personajes fingen no oír (convención
          teatral). Crea complicidad con el espectador. Frecuente en el Siglo de Oro.
        </Def>
      </div>

      <H3>Tipos de espacio teatral</H3>
      <div className="space-y-3">
        <Def titulo="Espacio escénico">
          El espacio físico real donde actúan los actores (el escenario). Lo que el espectador ve
          materialmente.
        </Def>
        <Def titulo="Espacio dramático">
          El espacio ficticio que la obra imagina: puede ser mucho más amplio que el escenario.
          Ciudades, batallas o interiores que no caben en el escenario existen en el espacio
          dramático, construido por el lenguaje y las acotaciones.
        </Def>
        <Def titulo="Espacio lúdico">
          La relación entre el espacio escénico y el espacio del público; el «entre» donde sucede el
          juego teatral.
        </Def>
      </div>
      <Tabla
        cabeceras={["Tipo de escenario", "Descripción", "Ejemplo histórico"]}
        filas={[
          [
            "Teatro a la italiana",
            "Escenario rectangular con arco de proscenio; público frente a la escena. Crea distancia y separación clara entre actores y espectadores.",
            "Ópera barroca; teatros del s. XIX",
          ],
          [
            "Teatro en arena (teatro circular)",
            "Escenario central rodeado por el público en todos los lados. Máxima proximidad; sin cuarta pared.",
            "Teatro griego antiguo; teatro contemporáneo",
          ],
          [
            "Teatro isabelino (thrust stage)",
            "Escenario que avanza hacia el público; espectadores en tres lados. Permite intimidad y acción simultánea.",
            "Globe Theatre de Shakespeare (Londres, 1599)",
          ],
          [
            "Corral de comedias",
            "Patio interior descubierto de edificio urbano. Tablado al fondo; público en el patio (mosqueteros), galerías y aposentos. Espacio vivo y ruidoso.",
            "Corral del Príncipe (Madrid, s. XVII)",
          ],
        ]}
      />

      <H3>La iluminación</H3>
      <p className="text-sm text-foreground/80 leading-relaxed">
        En el teatro griego y del Siglo de Oro las representaciones eran diurnas y al aire libre: la
        luz natural era la única iluminación. A partir del s. XVII (teatro isabelino con velas;
        teatro italiano con candilejas) y sobre todo en el teatro moderno, la iluminación artificial
        se convierte en un recurso expresivo fundamental.
      </p>
      <div className="space-y-2 mt-3">
        {[
          {
            t: "Función atmosférica",
            d: "La luz crea el ambiente emocional de la escena: una iluminación tenue y fría produce inquietud; una luz cálida y difusa, intimidad.",
          },
          {
            t: "Función simbólica",
            d: "La luz asociada a la vida, la razón, lo divino; la oscuridad a la muerte, el miedo, lo oculto. Este simbolismo, presente ya en los textos escritos, se materializa en escena.",
          },
          {
            t: "Función directiva",
            d: "El foco de luz guía la atención del espectador hacia lo que el director quiere que vea. El resto del escenario queda en penumbra o en negro.",
          },
          {
            t: "En el análisis de texto",
            d: "Cuando el texto describe luz en sus acotaciones («sale el sol», «cae la noche», «una vela solitaria»), esa imagen es analizable como símbolo, no solo como decorado.",
          },
        ].map((item) => (
          <div key={item.t} className="flex gap-2 text-sm">
            <span className="font-medium text-ink min-w-[180px] shrink-0">{item.t}</span>
            <span className="text-foreground/75 leading-relaxed">{item.d}</span>
          </div>
        ))}
      </div>

      <H3>Géneros teatrales</H3>
      <div className="space-y-3">
        <Def titulo="Tragedia">
          Presenta un conflicto inevitable que lleva al protagonista —un ser de cierta grandeza— a
          un final funesto, habitualmente causado por su propia hamartia. Su fin es la catarsis en
          el espectador. Origen griego; máximos exponentes: Sófocles, Eurípides, Shakespeare, García
          Lorca.
        </Def>
        <Def titulo="Comedia">
          Conflictos que se resuelven favorablemente; uso del humor, la ironía, el enredo y la
          parodia. Refleja y critica costumbres sociales. Suele terminar con matrimonio o
          reconciliación. Origen griego (Aristófanes); Siglo de Oro (Lope de Vega, Tirso); comedia
          de costumbres moderna.
        </Def>
        <Def titulo="Tragicomedia / Drama">
          Combina elementos trágicos y cómicos; no necesariamente con final feliz ni fatal. Refleja
          la ambigüedad de la vida cotidiana. Lope lo teorizó en el <em>Arte nuevo</em>; es el
          género dominante en el teatro moderno y contemporáneo.
        </Def>
        <Def titulo="Teatro del absurdo">
          Corriente del s. XX (Beckett, Ionesco) que dramatiza la incomunicación humana y la
          ausencia de sentido mediante situaciones ilógicas, diálogos circulares y estructuras que
          se niegan a sí mismas. <em>Esperando a Godot</em> es el ejemplo canónico.
        </Def>
      </div>

      <H3>El conflicto dramático</H3>
      <p className="text-sm text-foreground/80 leading-relaxed">
        Todo texto teatral se organiza en torno a un <strong>conflicto</strong>: la tensión entre
        fuerzas opuestas. Puede ser <strong>externo</strong> (entre personajes o entre el individuo
        y la sociedad: Bernarda vs. sus hijas; Fuente Ovejuna vs. el Comendador) o{" "}
        <strong>interno</strong> (dentro del personaje: la duda de Hamlet, la ambición de Macbeth).
        En la tragedia, el conflicto es irresoluble; en la comedia, se resuelve.
      </p>

      <H3>Breve cronología</H3>
      <Tabla
        cabeceras={["Período", "Características", "Autores clave"]}
        filas={[
          [
            "Teatro griego (ss. VI-IV a.C.)",
            "Fiestas dionisíacas. Tragedia, comedia, sátira. Coro, máscara, anfiteatro al aire libre.",
            "Esquilo, Sófocles, Eurípides, Aristófanes",
          ],
          [
            "Teatro romano (ss. III a.C.–V d.C.)",
            "Adapta los modelos griegos. Comedia de enredo. Primer teatro con edificio fijo.",
            "Plauto, Terencio, Séneca",
          ],
          [
            "Teatro del Siglo de Oro español (ss. XVI-XVII)",
            "Comedia nueva: tres actos, honor, polimetría, mezcla de géneros. Corrales de comedias.",
            "Lope de Vega, Tirso de Molina, Calderón de la Barca",
          ],
          [
            "Teatro clásico francés (s. XVII)",
            "Rigurosa aplicación de las tres unidades. Tragedia de corte aristotélico.",
            "Racine, Corneille, Molière",
          ],
          [
            "Teatro moderno (ss. XIX-XX)",
            "Realismo psicológico, simbolismo, crítica social. El director como figura creativa.",
            "Ibsen, Chéjov, García Lorca, Brecht",
          ],
          [
            "Teatro contemporáneo",
            "Teatro del absurdo, metateatro, teatro postdramático, ruptura de la cuarta pared.",
            "Beckett, Ionesco, Arrabal, Müller",
          ],
        ]}
      />

      <TipIB>
        En la Prueba 1, si el texto es teatro, analiza siempre las acotaciones: son la voz del
        dramaturgo que los personajes no pueden expresar. El bastón de Bernarda, la luz que Lorca
        describe, los silencios anotados: todo es material analizable. Y recuerda: en teatro, la
        ironía dramática —lo que el espectador sabe y el personaje no— es uno de los efectos más
        poderosos que puedes identificar y razonar.
      </TipIB>
    </div>
  );
}

function contenidoRecursos(isEN?: boolean) {
  if (isEN) return contenidoRecursosEN();
  return (
    <div className="space-y-5">
      <p className="text-sm text-foreground/80 leading-relaxed">
        Identificar un recurso literario es el punto de partida, no el objetivo. El IB no evalúa si
        sabes nombrar figuras retóricas: evalúa si sabes explicar qué hacen en el texto y cómo
        contribuyen al significado global.
      </p>

      <H3>La estructura INCA</H3>
      <p className="text-sm text-foreground/80 leading-relaxed">
        Para analizar cualquier recurso en la Prueba 1, aplica esta estructura:
      </p>
      <div className="space-y-2">
        <Def titulo="I — Identificar">
          Nombra el recurso con precisión: no «hay una repetición» sino «hay una anáfora».
        </Def>
        <Def titulo="N — Nombrar el fragmento">
          Cita el fragmento exacto donde aparece. La cita debe ser breve y precisa.
        </Def>
        <Def titulo="C — Conectar con el significado">
          Explica qué hace el recurso en ese contexto: ¿qué intensifica, qué contrasta, qué sugiere,
          qué enmascara?
        </Def>
        <Def titulo="A — Articular el efecto en el lector">
          ¿Qué le produce al lector? ¿Qué emoción, qué idea, qué pregunta despierta?
        </Def>
      </div>

      <H3>Descripción vs. análisis: la diferencia en el examen</H3>
      <div className="space-y-3">
        <div className="p-4 rounded-lg border border-rose-300 bg-rose-50/50">
          <div className="text-[10px] uppercase tracking-[0.18em] text-rose-700 mb-2">
            Descripción (insuficiente)
          </div>
          <p className="text-sm text-foreground/80 italic">
            «Neruda usa anáfora en el Poema XX: repite el verso "Puedo escribir los versos más
            tristes esta noche" varias veces.»
          </p>
        </div>
        <div className="p-4 rounded-lg border border-emerald-300 bg-emerald-50/50">
          <div className="text-[10px] uppercase tracking-[0.18em] text-emerald-700 mb-2">
            Análisis (nivel IB)
          </div>
          <p className="text-sm text-foreground/80 italic">
            «La anáfora del verso "Puedo escribir los versos más tristes esta noche" regresa a lo
            largo del poema marcando cada oscilación emocional del hablante lírico: cada vez que el
            verso reaparece, el hablante ha intentado sin éxito distanciarse del recuerdo. La
            repetición mimetiza en la forma la incapacidad de olvidar —el verso vuelve como vuelve
            el amante a los mismos pensamientos.»
          </p>
        </div>
      </div>

      <H3>Los cinco errores más frecuentes</H3>
      <div className="space-y-2">
        {[
          {
            n: "1",
            titulo: "Nombrar sin analizar",
            texto:
              "Listar recursos sin explicar su efecto. El corrector IB necesita saber qué hace el recurso, no solo que existe.",
          },
          {
            n: "2",
            titulo: "Decir «el autor» en poesía",
            texto:
              "En poesía, siempre es «el hablante lírico» o «la voz poética». Decir «Lorca dice» implica que el poema es autobiográfico, lo que es una simplificación inaceptable en el IB.",
          },
          {
            n: "3",
            titulo: "Analizar el contenido, no la forma",
            texto:
              "Parafrasear lo que dice el texto en lugar de analizar cómo lo dice. La Prueba 1 evalúa el análisis literario, no el resumen.",
          },
          {
            n: "4",
            titulo: "Citar demasiado",
            texto:
              "Las citas largas consumen espacio sin aportar análisis. Cita lo mínimo necesario y analiza lo máximo posible.",
          },
          {
            n: "5",
            titulo: "Repetir la misma idea",
            texto:
              "Decir lo mismo con distintas palabras en varios párrafos. El corrector busca profundidad, no extensión.",
          },
        ].map((e) => (
          <div key={e.n} className="flex gap-3 p-3 rounded-md border border-border bg-card">
            <span className="text-[11px] font-bold text-muted-foreground mt-0.5 shrink-0 w-4">
              {e.n}
            </span>
            <div>
              <span className="text-sm font-medium text-ink">{e.titulo}. </span>
              <span className="text-sm text-foreground/80">{e.texto}</span>
            </div>
          </div>
        ))}
      </div>

      <H3>Jerarquía de análisis</H3>
      <p className="text-sm text-foreground/80 leading-relaxed">
        No todos los recursos tienen el mismo peso. En la Prueba 1, prioriza los recursos que
        aparecen de forma sistemática (el color verde como símbolo en todo el poema de Lorca, la
        anáfora que estructura el Poema XX) sobre los que aparecen una sola vez. Un recurso
        recurrente es una elección deliberada; un recurso aislado puede ser relevante o no.
      </p>

      <TipIB>
        La pregunta que un corrector IB se hace al leer tu análisis es: «¿Por qué el autor eligió
        este recurso en este momento? ¿Qué conseguiría con otra elección que no consigue con esta?».
        Si puedes responder esa pregunta, estás analizando.
      </TipIB>
    </div>
  );
}

function contenidoVocabulario(isEN?: boolean) {
  if (isEN) return contenidoVocabularioEN();
  return (
    <div className="space-y-5">
      <p className="text-sm text-foreground/80 leading-relaxed">
        Un análisis literario de nivel IB se distingue no solo por lo que dice, sino por{" "}
        <strong>cómo lo dice</strong>. Esta ficha reúne el vocabulario imprescindible: conectores
        para estructurar el argumento, verbos para describir lo que hace el texto, adverbios para
        graduar la valoración y sinónimos para evitar repeticiones que debilitan el ensayo.
      </p>

      {/* 1. Conectores del discurso */}
      <H3>Conectores del discurso</H3>
      <p className="text-sm text-foreground/80 leading-relaxed">
        Los conectores articulan el razonamiento y guían al lector. Usarlos con precisión es un
        indicador directo del criterio C (Organización y desarrollo).
      </p>
      <Tabla
        cabeceras={["Función", "Conectores"]}
        filas={[
          [
            "Adición",
            "además, asimismo, del mismo modo, igualmente, también, de igual manera, por añadidura, sumado a esto, cabe añadir que, junto a ello",
          ],
          [
            "Contraste / concesión",
            "sin embargo, no obstante, a pesar de ello, aunque, si bien, con todo, aun así, pese a que, a diferencia de, en contraposición a, en cambio, por el contrario",
          ],
          [
            "Causa",
            "porque, dado que, puesto que, ya que, en vista de que, debido a, a causa de, por cuanto, en tanto que",
          ],
          [
            "Consecuencia",
            "por tanto, por consiguiente, en consecuencia, de ahí que, de modo que, así pues, lo que lleva a, lo cual produce, esto origina que",
          ],
          [
            "Ejemplo / ilustración",
            "por ejemplo, en concreto, en particular, tal como se aprecia en, como se evidencia en, a saber, sirva de ejemplo, esto se manifiesta cuando",
          ],
          [
            "Énfasis",
            "en efecto, de hecho, ciertamente, es más, incluso, sobre todo, especialmente, cabe destacar que, conviene subrayar que, resulta significativo que",
          ],
          [
            "Ordenación",
            "en primer lugar, en segundo lugar, en tercer lugar, por último, por una parte… por otra, a continuación, seguidamente, para empezar, para concluir",
          ],
          [
            "Conclusión",
            "en conclusión, en definitiva, en suma, en síntesis, para finalizar, en último término, todo ello muestra que, de lo anterior se desprende que",
          ],
          [
            "Reformulación",
            "es decir, o sea, en otras palabras, dicho de otro modo, esto es, lo que equivale a decir que",
          ],
        ]}
      />

      {/* 2. Verbos analíticos */}
      <H3>Verbos analíticos</H3>
      <p className="text-sm text-foreground/80 leading-relaxed">
        Sirven para describir con precisión qué hace el texto, el autor o el recurso. Sustituyen a
        los verbos comodín «decir», «hablar» o «hacer».
      </p>
      <Tabla
        cabeceras={["Función", "Verbos"]}
        filas={[
          [
            "El autor construye / articula",
            "construye, articula, estructura, elabora, desarrolla, traza, diseña, teje, configura, forja, dispone, organiza, compone, orquesta",
          ],
          [
            "El texto muestra / presenta",
            "presenta, expone, plantea, introduce, ofrece, despliega, exhibe, manifiesta, revela, refleja, pone de manifiesto, saca a la luz, deja entrever",
          ],
          [
            "El recurso sugiere / evoca",
            "sugiere, evoca, connota, implica, alude a, remite a, apunta hacia, insinúa, deja implícito, abre la posibilidad de, suscita la imagen de",
          ],
          [
            "El narrador / hablante describe",
            "describe, caracteriza, retrata, dibuja, pinta, reconstruye, narra, relata, cuenta, rememora, recupera, recrea",
          ],
          [
            "El texto cuestiona / problematiza",
            "cuestiona, problematiza, interroga, desafía, subvierte, transgrede, pone en entredicho, desmonta, deconstruye, ironiza sobre",
          ],
          [
            "El autor recurre / emplea",
            "recurre a, emplea, utiliza, se vale de, hace uso de, incorpora, introduce, integra, inserta, apela a, acude a",
          ],
          [
            "El texto establece / relaciona",
            "establece, relaciona, vincula, conecta, asocia, contrapone, yuxtapone, paraleliza, contrasta, equipara, asimila",
          ],
        ]}
      />

      {/* 3. Verbos evaluativos */}
      <H3>Verbos evaluativos</H3>
      <p className="text-sm text-foreground/80 leading-relaxed">
        Expresan el juicio analítico: qué efecto produce el recurso y por qué es significativo. Son
        los verbos que elevan una descripción a análisis real.
      </p>
      <Tabla
        cabeceras={["Función", "Verbos y expresiones"]}
        filas={[
          [
            "El recurso logra / consigue",
            "logra, consigue, alcanza, obtiene, produce, genera, provoca, suscita, desencadena, origina, propicia, favorece, potencia, intensifica, amplifica, refuerza",
          ],
          [
            "El recurso contribuye a",
            "contribuye a, colabora en, participa en, coadyuva a, redunda en, incide en, repercute en, tiene el efecto de",
          ],
          [
            "El recurso ilustra / demuestra",
            "ilustra, demuestra, evidencia, pone de relieve, pone en primer plano, subraya, enfatiza, accentúa, resalta, destaca, jerarquiza",
          ],
          [
            "Expresiones de valoración",
            "es significativo que, resulta llamativo que, llama la atención que, no es casual que, cabe señalar que, conviene destacar que, hay que notar que, es de notar que, merece atención el hecho de que",
          ],
          [
            "Introduce el efecto en el lector",
            "crea en el lector, genera en el receptor, invita al lector a, obliga al lector a, lleva al lector a, produce el efecto de, deja en el lector la sensación de",
          ],
        ]}
      />

      {/* 4. Adverbios y expresiones evaluativas */}
      <H3>Adverbios y expresiones evaluativos</H3>
      <p className="text-sm text-foreground/80 leading-relaxed">
        Gradúan la intensidad del análisis y matizan las afirmaciones. Evitan el tono absoluto o
        simplista («el poema dice que la vida es triste»).
      </p>
      <Tabla
        cabeceras={["Función", "Adverbios y expresiones"]}
        filas={[
          [
            "Certeza / evidencia",
            "claramente, evidentemente, manifiestamente, ostensiblemente, notablemente, palmariamente, inequívocamente, indudablemente, sin lugar a dudas",
          ],
          [
            "Grado / intensidad",
            "especialmente, particularmente, extraordinariamente, profundamente, marcadamente, destacadamente, de modo singular, de forma notable",
          ],
          [
            "Precisión",
            "precisamente, justamente, exactamente, concretamente, específicamente, en particular, de manera puntual",
          ],
          [
            "Matiz / probabilidad",
            "aparentemente, posiblemente, quizá, acaso, en cierta medida, en algún sentido, podría interpretarse que, cabe la posibilidad de que, parece sugerir que",
          ],
          [
            "Contraste con lo esperado",
            "paradójicamente, sorprendentemente, de manera inesperada, contra todo pronóstico, curiosamente, llamativamente",
          ],
          [
            "Efecto acumulativo",
            "progresivamente, paulatinamente, de manera gradual, de forma creciente, cada vez más, con mayor intensidad a medida que avanza",
          ],
        ]}
      />

      {/* 5. Sinónimos imprescindibles */}
      <H3>Sinónimos imprescindibles</H3>
      <p className="text-sm text-foreground/80 leading-relaxed">
        Palabras que se repiten en exceso en los ensayos IB y sus alternativas más precisas.
      </p>
      <Tabla
        cabeceras={["Palabra sobreutilizada", "Alternativas con matiz"]}
        filas={[
          [
            "mostrar",
            "revelar, manifestar, evidenciar, poner de manifiesto, denotar, reflejar, indicar, señalar, subrayar, apuntar, hacer patente, dejar entrever, transparentar",
          ],
          [
            "decir / hablar de",
            "relatar, narrar, describir, plantear, exponer, articular, formular, enunciar, afirmar, sostener, defender, evocar, aludir a, referirse a",
          ],
          [
            "importante / relevante",
            "significativo, llamativo, notable, destacado, sugerente, revelador, fundamental, decisivo, determinante, clave, central, medular",
          ],
          [
            "el autor",
            "el escritor, el poeta, la voz poética, el hablante lírico, el narrador, el enunciador, quien escribe, la instancia narrativa, la voz autorial",
          ],
          [
            "el texto / el poema",
            "el fragmento, el pasaje, el extracto, la obra, el relato, el poema, la estrofa, el verso, el párrafo, el episodio, el segmento",
          ],
          [
            "usar / utilizar",
            "emplear, recurrir a, valerse de, hacer uso de, incorporar, integrar, introducir, acudir a, servirse de, desplegar",
          ],
          [
            "efecto / resultado",
            "consecuencia, impacto, repercusión, alcance, resonancia, peso, carga semántica, connotación, dimensión, lectura posible",
          ],
          [
            "bonito / interesante",
            "sugerente, evocador, expresivo, logrado, eficaz, original, llamativo, insólito, perturbador, cargado de significado",
          ],
          [
            "triste / alegre",
            "melancólico, sombrío, lúgubre, elegíaco, nostálgico / jubiloso, exultante, vitalista, eufórico, luminoso",
          ],
          [
            "hablar sobre un tema",
            "abordar, tratar, desarrollar, explorar, examinar, problematizar, reflexionar sobre, profundizar en, indagar en, poner en cuestión",
          ],
        ]}
      />

      {/* 6. Frases de arranque por párrafo */}
      <H3>Frases de arranque por sección del ensayo</H3>
      <p className="text-sm text-foreground/80 leading-relaxed">
        Modelos de apertura para cada parte del análisis. No son fórmulas fijas: adáptalas al texto.
      </p>
      <Tabla
        cabeceras={["Sección", "Frases de arranque"]}
        filas={[
          [
            "Introducción (tesis)",
            "En este fragmento, [autor] construye… · El texto explora la tensión entre… · A través de [recurso], [autor] articula una visión de… · El poema / relato plantea desde su primer verso / línea…",
          ],
          [
            "Análisis de un recurso",
            "El empleo de [recurso] en [línea / párrafo] contribuye a… · Resulta significativo que [autor] recurra a [recurso], ya que… · La presencia de [recurso] genera un efecto de… · Cabe destacar que…",
          ],
          [
            "Conexión recurso → tema",
            "Este recurso no es meramente decorativo: refuerza la idea central de que… · Más allá de su función [estética / rítmica], [recurso] subraya… · Lo que en apariencia es [X] resulta ser, en realidad, una expresión de…",
          ],
          [
            "Contraste / comparación",
            "En contraposición a [elemento A], [elemento B] establece… · Si en los primeros versos / párrafos prevalece [X], hacia el final el tono se torna… · Mientras que [personaje A] representa [X], [personaje B] encarna…",
          ],
          [
            "Cierre / conclusión",
            "En definitiva, [autor] logra [efecto] mediante… · El texto consigue así [objetivo] a través de… · Todo ello convierte este fragmento en una exploración de… · En suma, la combinación de [recursos] produce un efecto de…",
          ],
        ]}
      />

      <TipIB>
        La diferencia entre un ensayo de banda 3 y uno de banda 5 suele estar en el vocabulario de
        transición y valoración. Evita «el autor usa metáforas para mostrar» y apunta a «el autor
        despliega una red de metáforas acuáticas que construye progresivamente la sensación de
        ahogamiento del protagonista». Específico, preciso, argumentado: esa es la fórmula.
      </TipIB>
    </div>
  );
}

function contenidoTeoriaLiteraria(isEN?: boolean) {
  const TEORIAS = [
    {
      nombre: "Psicoanálisis",
      lema: "Los textos, como los sueños, dicen más de lo que parecen",
      explicacion:
        "Aplica las ideas de Freud al texto: busca deseos reprimidos, miedos inconscientes y conflictos psíquicos en los personajes, los símbolos y las imágenes. No se trata de psicoanalizaron al autor; se trata de leer el texto como si fuera un sueño colectivo.",
      preguntas: [
        "¿Qué deseos o miedos revela el comportamiento del personaje?",
        "¿Hay símbolos de muerte, erotismo o transgresión?",
        "¿El texto oculta o disfraza algo que el lector puede descifrar?",
        "¿Hay una figura paterna, materna o autoritaria relevante?",
      ],
      ejemplo:
        'En "La casa de Bernarda Alba", el caballo negro puede leerse como símbolo del deseo sexual reprimido de las hijas, y Bernarda como el superego que lo aplasta. El pozo simboliza el inconsciente: oscuro, profundo, peligroso.',
      enElIB:
        "Analiza un símbolo y argumenta qué conflicto psíquico o deseo reprimido representa. No afirmes nada sobre la vida del autor; analiza el texto.",
    },
    {
      nombre: "Teoría feminista",
      lema: "¿A quién da voz el texto? ¿A quién silencia?",
      explicacion:
        "Examina cómo el género configura la experiencia de los personajes y la voz narrativa. Pregunta cómo se representan las mujeres, qué estereotipos reproduce o cuestiona el texto, y qué voces quedan al margen.",
      preguntas: [
        "¿Los personajes femeninos tienen agencia (capacidad de decidir) o son objetos del deseo de otros?",
        "¿La voz narradora adopta una perspectiva masculina o femenina?",
        "¿El texto refuerza roles de género o los cuestiona?",
        "¿Qué personajes tienen poder y cuáles no, y por qué?",
      ],
      ejemplo:
        'En "La casa de Bernarda Alba", Lorca muestra una sociedad en la que las mujeres solo tienen dos salidas: la sumisión o la represión del deseo convertida en poder sobre otras (Bernarda). Una lectura feminista analiza cómo el patriarcado destruye desde dentro.',
      enElIB:
        "Señala qué rol tiene un personaje femenino y argumenta si el texto lo problematiza o lo normaliza. Evita juicios morales; analiza cómo funciona el texto.",
    },
    {
      nombre: "Teoría de la recepción",
      lema: "El significado lo construye quien lee, no solo quien escribe",
      explicacion:
        "El mismo texto puede significar cosas muy distintas para lectores de épocas o culturas diferentes. Cada lector trae un horizonte de expectativas propio: conocimientos, valores, prejuicios. El significado es siempre una negociación entre texto y lector.",
      preguntas: [
        "¿Qué esperaba yo al leer este texto y cómo se cumplieron o frustraron esas expectativas?",
        "¿Cómo lo habría leído un lector de la época del autor?",
        "¿El texto deja huecos o ambigüedades que el lector debe completar?",
        "¿Qué efecto produce en mí como lector y por qué?",
      ],
      ejemplo:
        '"Don Quijote" fue leído en el s. XVII como parodia cómica. En el s. XIX romántico, como tragedia del idealismo. Hoy, como metaficción. Ninguna lectura es "la correcta"; cada una dice algo sobre la época del lector.',
      enElIB:
        'Comenta qué efecto produce el texto en el lector y si ese efecto depende de claves internas del texto o del contexto de quien lo lee. Es válido decir: "Un lector contemporáneo podría interpretar esto como..."',
    },
    {
      nombre: "Marxismo / Crítica social",
      lema: "¿A qué clase social pertenecen los personajes? ¿A quién sirve el texto?",
      explicacion:
        "Lee la literatura como reflejo o cuestionamiento de las relaciones de poder económico y social. Examina quién tiene poder en el texto, cómo se reproduce la desigualdad de clases, y si el texto normaliza o critica ese sistema.",
      preguntas: [
        "¿Qué clase social representan los personajes principales y secundarios?",
        "¿El texto muestra conflictos entre clases o grupos sociales?",
        "¿Hay personajes explotados o marginados? ¿Cómo los representa el narrador?",
        "¿A qué intereses favorece la visión del mundo que propone el texto?",
      ],
      ejemplo:
        'En "Fuente Ovejuna" (Lope de Vega), el conflicto entre el Comendador y el pueblo no es solo de honor: es una lucha de clases en la que el pueblo unido vence al opresor. Una lectura marxista analiza si Lope legitima esa resistencia o la contiene.',
      enElIB:
        "Si el texto muestra desigualdad social, comenta qué posición adopta el narrador ante ella: ¿la critica, la naturaliza, la ironiza? Un párrafo que relacione clase social con elecciones formales del texto es de nivel IB.",
    },
    {
      nombre: "Formalismo / Nueva crítica",
      lema: "El texto es suficiente: todo lo que importa está en las palabras",
      explicacion:
        "Propone leer el texto como un objeto autónomo. La biografía del autor, el contexto histórico y las intenciones declaradas son irrelevantes: solo cuenta lo que está escrito. Se analizan la forma, el estilo y la tensión entre lo que se dice y cómo se dice.",
      preguntas: [
        "¿Cómo está construido el texto? ¿Qué rasgos formales son más llamativos?",
        "¿Hay tensión o ironía entre lo que dice el texto y cómo lo dice?",
        "¿Qué hace el lenguaje para producir su efecto específico?",
        "¿Hay patrones de repetición, contraste o simetría que organicen el texto?",
      ],
      ejemplo:
        'Una lectura formalista de "Romance sonámbulo" de Lorca no pregunta qué quiso decir Lorca: analiza la estructura del romance (octosílabos, rima asonante), el uso del verde como color recurrente, la ambigüedad sintáctica de las frases y el efecto de desorientación que produce.',
      enElIB:
        'La Prueba 1 es, por diseño, una lectura formalista: se te da un texto sin contexto biográfico y debes analizarlo desde dentro. Esta es la habilidad central del examen. Cuando dices "el autor usa X para lograr Y", estás siendo formalista.',
    },
    {
      nombre: "Estructuralismo",
      lema: "El texto tiene una gramática oculta que lo organiza",
      explicacion:
        "Busca en los textos estructuras profundas que organizan el significado: oposiciones binarias (vida/muerte, ciudad/campo, masculino/femenino), arquetipos narrativos y sistemas de signos. No analiza el contenido; analiza el sistema que lo produce.",
      preguntas: [
        "¿Qué oposiciones binarias estructuran el texto?",
        "¿El protagonista sigue un patrón arquetípico (héroe, prueba, transformación)?",
        "¿Hay un sistema de valores que organice el mundo del texto?",
        "¿Qué personajes o elementos representan los dos lados de una oposición central?",
      ],
      ejemplo:
        "En muchos cuentos latinoamericanos, la oposición civilización/naturaleza (o ciudad/selva) estructura el conflicto: el protagonista entra en un espacio salvaje y regresa transformado. Esta estructura se repite en Quiroga, Rivera y muchos autores del Boom.",
      enElIB:
        "Identifica una oposición binaria central (luz/oscuridad, orden/caos, público/privado) y analiza cómo los personajes y el lenguaje se posicionan en relación a ella. Es un buen armazón para la tesis de un ensayo.",
    },
    {
      nombre: "Postcolonialismo",
      lema: "¿Desde qué punto de vista se cuenta esta historia?",
      explicacion:
        "Examina cómo la literatura reproduce o cuestiona las relaciones de poder entre culturas dominantes y colonizadas. Analiza quién tiene voz en el texto, qué culturas se presentan como normales y cuáles como exóticas, y cómo el lenguaje puede ser instrumento de dominio o de resistencia.",
      preguntas: [
        "¿Desde qué posición cultural o social se narra la historia?",
        "¿Hay personajes cuya cultura o identidad se exotiza o inferioriza?",
        "¿El texto reproduce estereotipos coloniales o los desmonta?",
        "¿Quién no tiene voz en este texto y por qué?",
      ],
      ejemplo:
        "En muchas novelas del Boom latinoamericano (García Márquez, Vargas Llosa), la mezcla de español castizo con elementos orales, indígenas o locales no es un defecto de estilo: es una afirmación de identidad cultural frente a la tradición literaria europea.",
      enElIB:
        "Si el texto pertenece a una cultura no occidental o mezcla lenguas y tradiciones, comenta cómo el lenguaje mismo es un acto político. Evita leer textos latinoamericanos o africanos con criterios exclusivamente europeos.",
    },
    {
      nombre: "Intertextualidad",
      lema: "Ningún texto nace de la nada: todo texto dialoga con otros textos",
      explicacion:
        "Todo texto está tejido de referencias a otros textos: citas, alusiones, parodias, reescrituras. No es una deficiencia; es la condición natural de la literatura. El diálogo puede ser explícito (cita directa) o implícito (ecos temáticos, estructurales o estilísticos).",
      preguntas: [
        "¿El texto alude a otros textos, mitos o tradiciones literarias?",
        "¿Reescribe o parodia un texto anterior?",
        "¿Qué añade ese diálogo intertextual al significado del texto?",
        "¿El lector necesita conocer el texto original para entender la referencia?",
      ],
      ejemplo:
        '"Bodas de sangre" dialoga con el romance tradicional español y la tragedia griega. "Cien años de soledad" abre con una estructura circular que recuerda al Génesis bíblico. "Don Quijote" parodia las novelas de caballería que cita explícitamente.',
      enElIB:
        "Si reconoces una alusión mítica, bíblica o literaria, explica qué añade esa referencia al significado. No es obligatorio conocerlo todo, pero si lo reconoces, mencionarlo —y razonarlo— eleva el análisis claramente.",
    },
  ];

  const teorias = isEN ? TEORIAS_EN : TEORIAS;

  return (
    <div className="space-y-6">
      <p className="text-sm text-foreground/80 leading-relaxed">
        {isEN
          ? "Literary-theory approaches are lenses: each illuminates different aspects of the same text. You don't have to pick one and apply it rigidly —on Paper 1 you can combine several— but knowing each approach widens the questions you know how to ask of a text."
          : "Los enfoques de teoría literaria son lentes: cada uno ilumina aspectos distintos del mismo texto. No tienes que elegir uno y aplicarlo de forma rígida —en la Prueba 1 puedes combinar varios—, pero conocer cada enfoque amplía las preguntas que sabes hacerle a un texto."}
      </p>
      <TipIB isEN={isEN}>
        {isEN
          ? "On Paper 1 you are not asked to name the theoretical approach you use. What matters is that you ask the right questions of the text. These approaches are a toolkit, not a list of terms to show off that you know them."
          : "En la Prueba 1 no se te pide que nombres el enfoque teórico que usas. Lo que importa es que hagas las preguntas correctas al texto. Estos enfoques son una caja de herramientas, no una lista de términos para demostrar que los sabes."}
      </TipIB>
      <div className="space-y-5">
        {teorias.map((t) => (
          <div key={t.nombre} className="rounded-lg border border-border bg-card overflow-hidden">
            <div className="px-5 py-3 border-b border-border bg-accent/20">
              <div className="font-serif text-base font-semibold text-ink">{t.nombre}</div>
              <div className="text-[11px] text-foreground/55 italic mt-0.5">{t.lema}</div>
            </div>
            <div className="px-5 py-4 space-y-3">
              <p className="text-sm text-foreground/80 leading-relaxed">{t.explicacion}</p>
              <div>
                <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground mb-2">
                  {isEN ? "Questions to ask the text" : "Preguntas que puedes hacerle al texto"}
                </div>
                <ul className="space-y-1">
                  {t.preguntas.map((p) => (
                    <li key={p} className="flex gap-2 text-xs text-foreground/75 leading-relaxed">
                      <span className="text-primary/60 shrink-0 mt-0.5">→</span>
                      <span>{p}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="p-3 rounded-md border border-amber-200 bg-amber-50/60">
                <div className="text-[10px] uppercase tracking-[0.18em] text-amber-700 mb-1.5">
                  {isEN ? "Example" : "Ejemplo"}
                </div>
                <p className="text-xs text-foreground/80 leading-relaxed">{t.ejemplo}</p>
              </div>
              <div className="p-3 rounded-md border border-primary/15 bg-primary/5">
                <div className="text-[10px] uppercase tracking-[0.18em] text-primary mb-1.5">
                  {isEN ? "How to use it in IB analysis" : "Cómo usarlo en el análisis IB"}
                </div>
                <p className="text-xs text-foreground/80 leading-relaxed">{t.enElIB}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function contenidoTopicos(isEN?: boolean) {
  const TOPICOS: Topico[] = [
    {
      nombre: "Carpe diem",
      traduccion: "Aprovecha el día",
      explicacion:
        "La vida es breve y el placer debe disfrutarse ahora, antes de que la muerte llegue. No es nihilismo: es una invitación urgente a vivir. El tiempo pasa y no espera.",
      ejemplo:
        'Garcilaso, soneto XXIII: "En tanto que de rosa y azucena / se muestra la color en vuestro gesto...". Horacio: "Collige, virgo, rosas". Don Juan, que seduce con el argumento de que el tiempo es corto.',
      pistas:
        "Imágenes de flores que se marchitan, belleza que se va, juventud fugaz. Verbos en imperativo (vive, goza, aprovecha). Urgencia temporal.",
      ib: "Analiza qué urgencia crea en el texto y qué dice sobre la relación del hablante con el tiempo o la muerte. Si hay imperativos, comenta su efecto.",
    },
    {
      nombre: "Tempus fugit",
      traduccion: "El tiempo huye",
      explicacion:
        "El tiempo pasa irremediablemente y no podemos detenerlo. A diferencia del carpe diem (que invita a actuar), el tempus fugit se detiene a contemplar la pérdida con melancolía.",
      ejemplo:
        'Manrique, "Coplas a la muerte de su padre". Quevedo, sonetos morales. Las elegías románticas de Bécquer.',
      pistas:
        "Verbos de paso y cambio (se fue, ya no, ha pasado). Comparaciones con ríos, vientos o sombras que desaparecen. Tono melancólico o elegíaco.",
      ib: "Comenta qué recursos formales (tiempos verbales, imágenes de movimiento o desaparición) refuerzan la sensación de tiempo que escapa.",
    },
    {
      nombre: "Memento mori",
      traduccion: "Recuerda que vas a morir",
      explicacion:
        "La muerte es inevitable y universal. Recordarlo constantemente debe servir para orientar la vida hacia lo que importa. No es desesperación, sino una llamada a la lucidez.",
      ejemplo:
        'Manrique, "Coplas". Los relojes de sol con inscripción "tempus fugit omnia". Los bodegones barrocos con calaveras y flores. La "Danza de la muerte" medieval.',
      pistas:
        "Símbolos de muerte (calavera, reloj, hoguera, ceniza). Reflexiones directas sobre la mortalidad. Segunda persona que interpela al lector.",
      ib: "Analiza qué efecto produce en el lector la confrontación directa con la muerte y qué visión del mundo implica ese gesto.",
    },
    {
      nombre: "Ubi sunt",
      traduccion: "¿Dónde están?",
      explicacion:
        "Pregunta retórica sobre el paradero de los grandes, los poderosos o los bellos del pasado. La respuesta implícita es siempre la misma: los se llevó el tiempo. Es un lamento elegíaco sobre lo que desaparece.",
      ejemplo:
        'Manrique, "Coplas": "¿Qué fue de los caballeros...?". Villon: "¿Dónde están las nieves de antaño?". Listas de nombres ilustres cuya grandeza se ha evaporado.',
      pistas:
        "Preguntas retóricas sobre personas o cosas del pasado. Listas de figuras históricas desaparecidas. Tono asombrado ante la ruina o el olvido.",
      ib: "Analiza la función de las preguntas retóricas acumuladas: ¿qué efecto produce esa lista de pérdidas sobre el lector? ¿A qué le invita a reflexionar?",
    },
    {
      nombre: "Locus amoenus",
      traduccion: "Lugar agradable",
      explicacion:
        "El lugar ideal: un prado con agua, sombra y brisa suave donde el hablante puede descansar, amar o reflexionar. Es un espacio de armonía y paz, alejado del ruido social.",
      ejemplo:
        "Las églogas de Garcilaso. La novela pastoril renacentista. Los espacios naturales idílicos en García Lorca. Cualquier jardín literario donde el tiempo parece detenerse.",
      pistas:
        "Prado, río o fuente, árbol con sombra, brisa suave, canto de pájaros, flores. Adjetivos positivos y sensoriales. Pausa narrativa contemplativa.",
      ib: "Analiza qué función tiene ese espacio en el texto: ¿contrasta con el conflicto humano? ¿Refleja o contradice el estado emocional del hablante?",
    },
    {
      nombre: "Locus horridus",
      traduccion: "Lugar terrible",
      explicacion:
        "El opuesto del locus amoenus: una naturaleza hostil, oscura y amenazante que refleja el caos interior del personaje o el tono oscuro del texto.",
      ejemplo:
        'Las tormentas del teatro romántico. La selva en "La vorágine" de Rivera. El páramo de Cómala en "Pedro Páramo" de Rulfo. El mar embravecido como espejo del dolor.',
      pistas:
        "Naturaleza oscura, amenazante o decadente. Adjetivos negativos (árido, tenebroso, asfixiante). El espacio como proyección del estado interior del personaje.",
      ib: "Analiza cómo el espacio amplifica el estado emocional del personaje o el tono del fragmento. La naturaleza hostil raramente es decorado: casi siempre es símbolo.",
    },
    {
      nombre: "Beatus ille",
      traduccion: "Dichoso aquel...",
      explicacion:
        "La alabanza de la vida sencilla del campo frente a la vida ambiciosa de la ciudad o la corte. El campo representa la autenticidad, la paz y la vida conforme a la naturaleza.",
      ejemplo:
        'Horacio, Oda II.16. Fray Luis de León, "Oda a la vida retirada". Fernández de Andrade, "Epístola moral a Fabio".',
      pistas:
        "Elogio de la vida simple y el campo. Crítica implícita a la ambición o la vida cortesana. Invitación a retirarse del mundo. Vocabulario de paz y suficiencia.",
      ib: "Relaciona este tópico con los valores que defiende el texto: ¿qué rechaza el hablante? ¿Es evasión personal o crítica social encubierta?",
    },
    {
      nombre: "Aurea mediocritas",
      traduccion: "Dorada medianía",
      explicacion:
        "El ideal horaciano de la vida moderada: ni demasiado rica ni demasiado pobre, alejada de los extremos. La felicidad está en la suficiencia, no en el exceso ni en la carencia.",
      ejemplo:
        'Horacio, "Odas". Fray Luis de León. Contrapunto en textos que critican la ambición desmedida o la miseria extrema.',
      pistas:
        "Elogio de lo moderado y suficiente. Rechazo de la ambición y el lujo. Vocabulario de equilibrio (bastante, suficiente, ni más ni menos, lo justo).",
      ib: "Analiza qué visión moral del mundo implica y si el texto la defiende, la cuestiona o la presenta como un ideal inalcanzable.",
    },
    {
      nombre: "Fortuna mutabilis",
      traduccion: "La fortuna es cambiante",
      explicacion:
        "La diosa Fortuna mueve su rueda sin cesar: quien hoy está arriba mañana caerá. Es una advertencia contra el orgullo y un consuelo para el que está abajo.",
      ejemplo:
        '"El conde Lucanor" (la rueda de la fortuna). Manrique, "Coplas". Reyes o poderosos que caen repentinamente en tragedias barrocas.',
      pistas:
        "Imagen de la rueda. Ascensos y caídas repentinas de personajes. Advertencias contra la soberbia. Exempla de grandes figuras caídas.",
      ib: "Analiza la función de la rueda de la Fortuna en la visión del mundo del texto: ¿es fatalismo, lección moral, o ambas cosas?",
    },
    {
      nombre: "Homo viator",
      traduccion: "El hombre viajero",
      explicacion:
        "La vida como un viaje, un camino que se recorre hacia un destino (la muerte, Dios, la sabiduría). El viajero aprende en el camino; el camino es la vida misma.",
      ejemplo:
        'Machado: "Caminante, son tus huellas el camino y nada más...". La Odisea. El Camino de Santiago. Dante en la "Divina Comedia".',
      pistas:
        "Vocabulario de viaje y camino. Etapas, obstáculos, pruebas que transforman al personaje. El destino como meta vital o espiritual.",
      ib: "Analiza cómo el viaje exterior refleja un camino interior: aprendizaje, pérdida, maduración. ¿Qué transforma al personaje en el recorrido?",
    },
    {
      nombre: "Vita flumen",
      traduccion: "La vida es un río",
      explicacion:
        "La vida comparada con un río que fluye sin parar hacia el mar, que es la muerte. La imagen expresa la inevitabilidad del paso del tiempo y la dirección única del destino.",
      ejemplo:
        'Manrique, "Coplas a la muerte de su padre": "Nuestras vidas son los ríos que van a dar en la mar, que es el morir."',
      pistas:
        "Comparación o metáfora explícita del río, el fluir, la corriente. El mar como destino final. Verbos de movimiento continuo e irreversible.",
      ib: "Analiza cómo la imagen del río condensa la visión del tiempo y la muerte. ¿Qué emociones produce en el lector esa imagen de movimiento sin retorno?",
    },
    {
      nombre: "Theatrum mundi",
      traduccion: "El mundo es un teatro",
      explicacion:
        "La vida es una representación: Dios es el director, los seres humanos somos actores que interpretamos un papel que no hemos elegido, y la muerte cae el telón. La existencia no es más real que una obra de teatro.",
      ejemplo:
        'Calderón, "El gran teatro del mundo". Hamlet: "El mundo entero es un escenario". Quevedo. La vida como farsa o ilusión representada.',
      pistas:
        "Vocabulario teatral en contextos no teatrales (papel, escena, representar, máscara). La vida como ilusión o engaño. Reflexiones sobre el libre albedrío.",
      ib: "Analiza la función filosófica de esta metáfora: ¿qué dice sobre la identidad del personaje, el libre albedrío o el sentido de la vida?",
    },
    {
      nombre: "Vanitas vanitatum",
      traduccion: "Vanidad de vanidades",
      explicacion:
        "Todo en el mundo es vano, efímero, insignificante. Las riquezas, la belleza, el poder: todo se marchita y desaparece. Origen bíblico (Eclesiastés). Muy frecuente en el Barroco.",
      ejemplo:
        'Quevedo, soneto "Miré los muros de la patria mía". Los bodegones barrocos con flores marchitas y calaveras. La poesía de las ruinas.',
      pistas:
        "Imágenes de ruinas, flores marchitas, objetos que se deterioran. Reflexiones sobre la inutilidad del esfuerzo humano. Tono desengañado o melancólico.",
      ib: "Analiza cómo los objetos o imágenes del texto encarnan la vanidad: ¿qué visión del mundo transmiten? ¿Qué invitan al lector a reconsiderar?",
    },
    {
      nombre: "Somnium vitae",
      traduccion: "La vida es un sueño",
      explicacion:
        "La vida es ilusoria, efímera, sin realidad firme. Al despertar (la muerte), se revela que todo era ficción. No sabemos si lo que vivimos es real.",
      ejemplo:
        'Calderón, "La vida es sueño": "¿Qué es la vida? Un frenesí. ¿Qué es la vida? Una ilusión, / una sombra, una ficción...". Quevedo. Los sueños y delirios del Romanticismo.',
      pistas:
        "Vocabulario onírico fuera de contexto literal (sueño, ilusión, despertar, engaño, ficción). Personajes que dudan de su propia experiencia. Metáforas de sombra.",
      ib: "Analiza qué visión de la realidad propone el texto: ¿el mundo es real o ilusorio? ¿Qué consecuencias tiene esa incertidumbre para los personajes?",
    },
    {
      nombre: "Collige, virgo, rosas",
      traduccion: "Recoge, virgen, las rosas",
      explicacion:
        "Variante del carpe diem dirigida a una mujer joven: disfruta de tu belleza y juventud ahora, antes de que se marchiten. Tiene una dimensión erótica implícita.",
      ejemplo:
        "Ausonio (origen latino). Garcilaso, soneto XXIII. Herrera. Quevedo. El motivo de la rosa como belleza femenina que envejece.",
      pistas:
        "Flores como símbolo de la belleza femenina que se marchita. Imperativo dirigido a una mujer joven. Urgencia del tiempo. Tono amoroso o seductor.",
      ib: "Comenta la dimensión de género: ¿el texto instrumentaliza la belleza femenina o la celebra? ¿Qué relación de poder implica el hablante con la destinataria?",
    },
    {
      nombre: "Descriptio puellae",
      traduccion: "Descripción de la muchacha",
      explicacion:
        "Descripción idealizada de la belleza femenina según un canon físico fijo: de arriba abajo, cabello rubio, frente blanca, ojos claros, mejillas sonrosadas, labios rojos... Es una convención literaria, no un retrato real.",
      ejemplo:
        "El cancionero petrarquista. Garcilaso y los sonetos del Renacimiento español. Casi cualquier descripción de la amada en la lírica del siglo XVI.",
      pistas:
        "Enumeración de rasgos físicos de arriba a abajo. Comparaciones con materiales nobles (oro, nieve, coral, rubí). Adjetivos superlativos. Sin psicología del personaje.",
      ib: "Analiza la función de la idealización: ¿el texto presenta a una persona real o a un ideal cultural? ¿Qué revela sobre la mirada y los valores del hablante?",
    },
    {
      nombre: "Donna angelicata",
      traduccion: "La dama angelicada",
      explicacion:
        "La amada es un ángel, un ser casi divino que eleva espiritualmente al amante. Su belleza no es solo física: es una manifestación de lo sagrado que acerca al amante a Dios o al ideal platónico.",
      ejemplo:
        'Dante, "Vita Nuova" (Beatriz). Petrarca (Laura). El petrarquismo en toda la poesía española del siglo XVI.',
      pistas:
        "La amada descrita con vocabulario celestial (ángel, divino, cielo, luz, gracia divina). Efecto purificador sobre el amante. Distancia enorme entre amante y amada.",
      ib: "Analiza cómo esta idealización define la relación: ¿hay igualdad? ¿Puede el amante realmente amar a alguien tan distante? ¿Qué dice esto sobre el amor que plantea el texto?",
    },
    {
      nombre: "Amor post mortem",
      traduccion: "Amor más allá de la muerte",
      explicacion:
        "El amor es tan poderoso que trasciende la muerte: los amantes se reúnen en el más allá, o la muerte del amado no extingue el amor del superviviente.",
      ejemplo:
        '"Romeo y Julieta". Quevedo, "Amor constante más allá de la muerte". Los amantes de Teruel. El amor romántico que solo puede culminar con la muerte.',
      pistas:
        "Muerte de uno o ambos amantes. Promesas de reencuentro eterno. Amor que se intensifica con la proximidad de la muerte. El más allá como espacio amoroso.",
      ib: "Analiza qué visión del amor propone el texto: ¿es romanticismo, espiritualidad, o ambos? ¿La muerte destruye el amor o lo perfecciona?",
    },
    {
      nombre: "Contemptus mundi",
      traduccion: "Desprecio del mundo",
      explicacion:
        "El mundo terrenal es corruptible, engañoso y sin valor. La verdadera vida está en el más allá o en la renuncia a lo material. Es la cara más extrema de la vanitas.",
      ejemplo:
        'Poesía ascético-mística (San Juan de la Cruz, Santa Teresa). Kempis, "Imitación de Cristo". El monje medieval que abandona todo lo mundano.',
      pistas:
        "Rechazo explícito de los placeres del mundo. Vocabulario ascético. Comparaciones entre el mundo y la nada o el polvo. Llamada a la vida espiritual.",
      ib: "Analiza qué relación propone el texto entre lo material y lo espiritual: ¿el rechazo del mundo es liberación, escapismo, o una forma de crítica social?",
    },
    {
      nombre: "Poder igualatorio de la muerte",
      traduccion: "La muerte nos iguala a todos",
      explicacion:
        "Ante la muerte, ricos y pobres, reyes y mendigos, sabios e ignorantes son iguales. Es un tópico democrático y subversivo: la muerte desmonta jerarquías sociales.",
      ejemplo:
        '"La danza de la muerte" medieval. Manrique, "Coplas". "El burlador de Sevilla" (Don Juan vencido por el comendador muerto). La muerte como gran niveladora.',
      pistas:
        "Personajes de muy diferentes clases sociales ante la muerte. Énfasis en que el poder no salva. Tono igualitario o irónico ante la vanidad del poderoso.",
      ib: "Analiza qué crítica social implica este tópico en el texto: ¿es consuelo para el humilde, advertencia al poderoso, o ambas cosas a la vez?",
    },
    {
      nombre: "Edad de oro",
      traduccion: "El tiempo mejor fue el pasado",
      explicacion:
        "En el pasado remoto los seres humanos vivían en armonía, inocencia y felicidad. El presente es una degradación de ese ideal. Puede ser un paraíso perdido, una infancia, o una utopía.",
      ejemplo:
        'Don Quijote discursa ante los cabreros sobre la Edad de Oro (cap. XI). Rousseau y el "buen salvaje". La infancia como paraíso en poemas elegíacos.',
      pistas:
        "Nostalgia del pasado. Contraste entre el antes ideal y el ahora degradado. Vocabulario de inocencia, armonía, naturaleza no corrompida.",
      ib: "Analiza qué valores defiende el hablante mediante esta idealización del pasado y qué crítica implica al presente.",
    },
    {
      nombre: "Menosprecio de corte y alabanza de aldea",
      traduccion: "La ciudad corrompe, el campo purifica",
      explicacion:
        "La vida cortesana (o urbana) es ambición, hipocresía y corrupción. La vida campesina es honesta, sencilla y verdadera. No siempre es ingenua: a veces es crítica política encubierta.",
      ejemplo:
        'Antonio de Guevara, "Menosprecio de corte y alabanza de aldea". Fray Luis de León. Las églogas renacentistas. Cualquier texto que oponga lo urbano a lo rural.',
      pistas:
        "Contraste explícito ciudad/campo. Adjetivos negativos para la corte (artificioso, engañoso, ruidoso) y positivos para el campo (paz, verdad, naturaleza). Voz con experiencia de ambos mundos.",
      ib: "Analiza qué visión de la sociedad propone el texto: ¿es evasión personal, crítica del poder, o nostalgia? ¿Es el campo una solución real o un ideal inalcanzable?",
    },
    {
      nombre: "Militia amoris",
      traduccion: "El amor es una guerra",
      explicacion:
        "El amor se describe con vocabulario militar: la amada es una fortaleza, el amante es un soldado que la asedia, las miradas son flechas, el corazón es el campo de batalla.",
      ejemplo:
        'Ovidio, "Ars amatoria". La poesía trovadoresca y petrarquista. Sonetos del siglo XVI donde el amante habla de heridas, rendición o victoria.',
      pistas:
        "Metáforas bélicas (flecha, herida, rendición, victoria, asedio, escudo, batalla). La amada como fortaleza o enemiga. El amante como guerrero vencido.",
      ib: "Analiza qué relación de poder implica esta metáfora: ¿quién tiene el poder en esta 'guerra'? ¿La amada es activa o pasiva? ¿El texto celebra esa dinámica o la critica?",
    },
    {
      nombre: "Religio amoris",
      traduccion: "El amor como religión",
      explicacion:
        "El amor se convierte en una religión laica: la amada es diosa, el amante es devoto, el amor es un culto con sus rituales y sus mártires. Todo el vocabulario religioso se aplica al amor.",
      ejemplo:
        'La lírica trovadoresca. El petrarquismo. "Cántico espiritual" de San Juan (en sentido inverso: mística que usa lenguaje amoroso).',
      pistas:
        "Vocabulario religioso en contexto amoroso (adorar, rezar, templo, dios, milagro, devoto, martirio, éxtasis, culto).",
      ib: "Analiza el efecto de mezclar lo sagrado y lo profano: ¿eleva el amor, ironiza sobre la religión, o ambas cosas? ¿Qué dice sobre la intensidad del sentimiento?",
    },
    {
      nombre: "Omnia vincit amor",
      traduccion: "El amor todo lo vence",
      explicacion:
        "El amor es la fuerza más poderosa del universo: vence a la muerte, al tiempo, al poder y a la razón. Es irresistible e inevitable; no hay voluntad que lo detenga.",
      ejemplo:
        'Virgilio, Églogas X. El amor cortés. Don Juan como esclavo del amor. El amor que mueve el mundo en el cierre de la "Divina Comedia" de Dante.',
      pistas:
        "Amor presentado como fuerza sobrehumana e irresistible. Personajes que actúan contra su razón o interés por amor. El amor como explicación última de las acciones.",
      ib: "Analiza si el texto celebra esta omnipotencia amorosa o la problematiza: ¿es el amor una fuerza liberadora o una pérdida de voluntad y razón?",
    },
    {
      nombre: "Exegi monumentum",
      traduccion: "He erigido un monumento",
      explicacion:
        "La convicción de que la obra literaria es más duradera que el mármol, los imperios o la vida humana. El poeta afirma que su escritura lo hará inmortal.",
      ejemplo:
        'Horacio: "Exegi monumentum aere perennius". Quevedo, "Amor constante más allá de la muerte" (el verso sobrevive al cuerpo). Shakespeare: "So long as men can breathe, or eyes can see..."',
      pistas:
        "Comparación entre la obra y materiales duraderos (bronce, piedra, mármol). Afirmación de que la escritura supera el tiempo o la muerte. Orgullo o consuelo ante la mortalidad.",
      ib: "Analiza qué dice este tópico sobre la relación entre el artista, su obra y la inmortalidad. ¿Es orgullo, consuelo, o ambos?",
    },
  ];

  const topicos = isEN ? TOPICOS_EN : TOPICOS;

  return (
    <div className="space-y-5">
      <p className="text-sm text-foreground/80 leading-relaxed">
        {isEN
          ? "Literary topics (topoi) are recurring ideas and situations that literature has repeated and reworked across centuries. Recognising them in a text is the starting point; what counts in IB analysis is explaining how that classical topic functions in that specific text and what effect it produces."
          : "Los tópicos literarios son ideas y situaciones recurrentes que la literatura ha repetido y reelaborado durante siglos. Reconocerlos en un texto es el punto de partida; lo que cuenta en el análisis IB es explicar cómo ese tópico clásico funciona en ese texto concreto y qué efecto produce."}
      </p>
      <div className="p-3 rounded-lg border border-border bg-muted/30">
        <p className="text-xs text-foreground/70">
          <span className="font-medium text-ink">
            {isEN ? "How to use these cards: " : "Cómo usar estas tarjetas: "}
          </span>
          {isEN
            ? "click any card to see the full explanation, examples, and analysis tips. Click again to close."
            : "haz clic en cualquier tarjeta para ver la explicación completa, ejemplos y pistas para el análisis. Clic de nuevo para cerrarla."}
        </p>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {topicos.map((t) => (
          <TarjetaTopico key={t.nombre} topico={t} isEN={isEN ?? false} />
        ))}
      </div>
    </div>
  );
}

function contenidoMovimientosEN() {
  return (
    <div className="space-y-5">
      <p className="text-sm text-foreground/80 leading-relaxed">
        Knowing the literary movement a text belongs to is not a matter of trivia: it helps you
        recognise which values, which worldview and which formal devices are typical of a period,
        and why an author makes the choices they do. On Paper 1 you will not be told the movement;
        you have to infer it from the language, form and concerns of the unseen passage.
      </p>

      <H3>Romanticism (late 18th – early 19th century)</H3>
      <Def titulo="Representative authors">
        William Wordsworth, Samuel Taylor Coleridge, William Blake, John Keats, Percy Bysshe
        Shelley, Lord Byron; in the United States, Ralph Waldo Emerson and Walt Whitman; Emily
        Dickinson is contemporary but stands apart.
      </Def>
      <p className="text-sm text-foreground/80 leading-relaxed mt-2">
        Romanticism reacts against Enlightenment rationalism and Augustan polish. It exalts the
        <strong> imagination</strong>, individual feeling, the <strong>sublime</strong> in nature,
        childhood, the visionary and the rebellious outsider. Wordsworth's{" "}
        <em>Preface to Lyrical Ballads</em> (1800) defines poetry as{" "}
        <em>"the spontaneous overflow of powerful feelings recollected in tranquillity"</em> and
        argues for the language really used by ordinary people. Forms revive the{" "}
        <strong>ballad</strong> and the <strong>lyric</strong>; the Romantic ode (Keats, Shelley)
        becomes a vehicle for meditation on mortality, beauty and artistic creation.
      </p>

      <H3>Victorian period (mid-to-late 19th century)</H3>
      <Def titulo="Representative authors">
        Alfred, Lord Tennyson, Robert Browning, Elizabeth Barrett Browning, Charlotte and Emily
        Brontë, Charles Dickens, George Eliot, Thomas Hardy, Christina Rossetti, Matthew Arnold,
        Gerard Manley Hopkins.
      </Def>
      <p className="text-sm text-foreground/80 leading-relaxed mt-2">
        The Victorians inherit Romantic feeling but write under the pressures of industrialisation,
        urban poverty, religious doubt (after Darwin and biblical criticism), social reform and
        empire. Themes: faith and doubt, the woman question, the condition of England, the cost of
        progress. Browning develops the <strong>dramatic monologue</strong>
        as a way of dissecting a speaker from inside. Hopkins, working in private, anticipates
        Modernism with his <em>sprung rhythm</em> and dense, compressed diction.
      </p>

      <H3>American Renaissance and Transcendentalism (mid-19th century)</H3>
      <Def titulo="Representative authors">
        Ralph Waldo Emerson, Henry David Thoreau, Walt Whitman, Emily Dickinson, Nathaniel
        Hawthorne, Herman Melville, Edgar Allan Poe.
      </Def>
      <p className="text-sm text-foreground/80 leading-relaxed mt-2">
        A burst of distinctively American writing. Emerson's essays (<em>Self-Reliance</em>,
        <em> Nature</em>) and Thoreau's <em>Walden</em> articulate Transcendentalism: an intuitive,
        individual relation to nature and the divine, beyond institutional religion. Whitman's{" "}
        <em>Leaves of Grass</em> (1855) invents an expansive, free-verse American voice. Dickinson,
        almost unpublished in her lifetime, writes compressed, slant-rhymed lyrics that interrogate
        death, faith and consciousness. Hawthorne and Melville explore Puritan inheritance and
        metaphysical evil; Poe perfects the gothic short story.
      </p>

      <H3>Realism and Naturalism (late 19th century)</H3>
      <Def titulo="Representative authors">
        George Eliot, Thomas Hardy, Henry James, Edith Wharton, Stephen Crane, Theodore Dreiser,
        Kate Chopin.
      </Def>
      <p className="text-sm text-foreground/80 leading-relaxed mt-2">
        Realism aims at the faithful representation of ordinary life and the moral complexity of
        social experience: free indirect style (Eliot, James) lets the narrator move into and out of
        a character's consciousness. <strong>Naturalism</strong>, influenced by Zola and Darwin,
        pushes further: characters are largely determined by heredity, environment and economic
        forces (Crane's <em>Maggie</em>, Dreiser's <em>Sister Carrie</em>). Style turns away from
        Romantic exaltation toward observation, documentary detail and ironic understatement.
      </p>

      <H3>Modernism (early 20th century, c. 1910–1940)</H3>
      <Def titulo="Representative authors">
        T. S. Eliot, Ezra Pound, W. B. Yeats, James Joyce, Virginia Woolf, Gertrude Stein, Wallace
        Stevens, William Carlos Williams, D. H. Lawrence, Marianne Moore, H. D.
      </Def>
      <p className="text-sm text-foreground/80 leading-relaxed mt-2">
        Modernism responds to the trauma of the First World War and to a sense that 19th-century
        forms cannot register a fragmented, post-religious, urban modernity. Pound's slogan
        <em> "make it new"</em> captures the impulse. Key features: <strong>fragmentation</strong>
        (Eliot's <em>The Waste Land</em>), the <strong>mythic method</strong> (Joyce's
        <em> Ulysses</em>, in which a single Dublin day is mapped onto the <em>Odyssey</em>),
        <strong> stream of consciousness</strong> (Woolf, Joyce), free verse, allusion,
        juxtaposition without explicit transitions, an unreliable or impersonal speaker, and a
        deliberate difficulty that demands an attentive reader.
      </p>

      <H3>Harlem Renaissance (1920s)</H3>
      <Def titulo="Representative authors">
        Langston Hughes, Zora Neale Hurston, Countee Cullen, Claude McKay, Jean Toomer, Nella
        Larsen.
      </Def>
      <p className="text-sm text-foreground/80 leading-relaxed mt-2">
        A flowering of Black American writing centred in Harlem, New York. Writers reclaim
        African-American identity, vernacular speech and the rhythms of jazz and blues as legitimate
        literary material. Hughes's <em>The Negro Speaks of Rivers</em> and Hurston's
        <em> Their Eyes Were Watching God</em> assert Black voice and experience without apology.
        McKay's sonnet <em>"If We Must Die"</em> shows how a traditional European form can be
        repurposed for protest.
      </p>

      <H3>Postmodernism (mid-to-late 20th century)</H3>
      <Def titulo="Representative authors">
        Samuel Beckett, Vladimir Nabokov, Thomas Pynchon, John Barth, Donald Barthelme, Margaret
        Atwood, Tom Stoppard, Don DeLillo, Italo Calvino in translation.
      </Def>
      <p className="text-sm text-foreground/80 leading-relaxed mt-2">
        Where Modernism mourns the loss of coherence, Postmodernism plays with it. Characteristic
        devices: <strong>metafiction</strong> (the text draws attention to its own status as
        fiction), <strong>intertextuality</strong>, parody and pastiche, unreliable narration, the
        mixing of high and low culture, scepticism toward
        <em> grand narratives</em>. Beckett's <em>Waiting for Godot</em> empties dramatic tradition
        almost to silence; Stoppard's <em>Rosencrantz and Guildenstern Are Dead</em>
        rewrites <em>Hamlet</em> from the wings.
      </p>

      <H3>Postcolonial literature (mid-20th century onwards)</H3>
      <Def titulo="Representative authors">
        Chinua Achebe, Salman Rushdie, Derek Walcott, Wole Soyinka, J. M. Coetzee, Chimamanda Ngozi
        Adichie, V. S. Naipaul, Jhumpa Lahiri, Jean Rhys, Tsitsi Dangarembga.
      </Def>
      <p className="text-sm text-foreground/80 leading-relaxed mt-2">
        Writers from former British (and other European) colonies rewrite the literary map from the
        perspective of those who were once written about. Recurring concerns: language (whose
        English?), hybridity, exile, the inheritance of empire, the recovery of pre- colonial
        culture. Achebe's <em>Things Fall Apart</em> answers Conrad; Rhys's{" "}
        <em>Wide Sargasso Sea</em> answers <em>Jane Eyre</em>; Walcott's <em>Omeros</em> sets a
        Caribbean epic against Homer. The act of <strong>writing back</strong> to the canon is
        itself part of the meaning.
      </p>

      <H3>Magical realism in English</H3>
      <Def titulo="Representative authors">
        Toni Morrison, Salman Rushdie, Angela Carter, Ben Okri.
      </Def>
      <p className="text-sm text-foreground/80 leading-relaxed mt-2">
        Inherited largely from Latin American writers in translation, magical realism in English
        fuses the supernatural with everyday reality without surprise: the ghost of a murdered child
        in Morrison's <em>Beloved</em>, the children born at midnight in Rushdie's
        <em> Midnight's Children</em>, the abiku spirit in Okri's <em>The Famished Road</em>. The
        marvellous is not metaphor decoration; it is the only adequate idiom for histories (slavery,
        partition, post-colonial violence) that strict realism cannot quite contain.
      </p>

      <TipIB isEN>
        On Paper 1 you do not need to date a movement, but you do need to recognise its
        fingerprints. Fragmented syntax, allusion and an impersonal speaker point to Modernism; a
        regular ballad stanza with a refrain and supernatural events points to Romantic-era
        balladry; a controlled dramatic monologue with a self-incriminating speaker is almost always
        Victorian. Use the movement to <em>frame</em> your interpretation, not to replace it.
      </TipIB>
    </div>
  );
}

function contenidoPoesiaEN() {
  return (
    <div className="space-y-5">
      <p className="text-sm text-foreground/80 leading-relaxed">
        Poetry is the genre in which form and content are most intimately bound together. Analysing
        a poem without attending to its form —rhythm, rhyme, line break, stanza— is analysing only
        half of the text. The questions to keep asking are:{" "}
        <em>why this form? why this metre? why this break here and not one syllable later?</em>
      </p>

      <H3>The lyric speaker and the persona</H3>
      <Def titulo="Key concept">
        The <strong>speaker</strong> is the voice that speaks in the poem. The speaker is not the
        author. When the speaker is clearly a constructed character distinct from the poet —a duke,
        a madman, an unborn child— we call them a <strong>persona</strong>.
      </Def>
      <p className="text-sm text-foreground/80 leading-relaxed mt-2">
        On Paper 1, never write <em>"Browning says that…"</em> or <em>"Plath feels…"</em>. Write{" "}
        <em>"the speaker"</em>, <em>"the persona"</em> or <em>"the voice of the poem"</em>.
        Browning's <em>"My Last Duchess"</em> is the classic example: the speaker is a Renaissance
        Duke who reveals, line by line, that he had his wife killed; the poem's meaning lives in the
        gap between what he says and what we infer. Eliot's J. Alfred Prufrock and Plath's speaker
        in <em>"Daddy"</em> are equally constructed personas.
      </p>

      <H3>Tone and mood</H3>
      <p className="text-sm text-foreground/80 leading-relaxed">
        <strong>Tone</strong> is the speaker's attitude toward the subject. <strong>Mood</strong>
        is the emotional atmosphere the poem creates in the reader. Both are built through diction,
        syntax, sound and rhythm; they are never simply asserted.
      </p>
      <Tabla
        cabeceras={["Poet", "Characteristic tone", "Brief illustration"]}
        filas={[
          [
            "John Donne",
            "Urgent, argumentative, conversational",
            "«Batter my heart, three-person'd God»",
          ],
          ["Robert Frost", "Deceptively plain, quietly ironic", "«And miles to go before I sleep»"],
          [
            "Sylvia Plath",
            "Controlled fury, brittle precision",
            "«Daddy, daddy, you bastard, I'm through.»",
          ],
          [
            "Gerard Manley Hopkins",
            "Ecstatic, breathless, sprung",
            "«Glory be to God for dappled things»",
          ],
          ["Philip Larkin", "Dry, sceptical, colloquial", "«They fuck you up, your mum and dad.»"],
        ]}
      />

      <H3>Metre and metrical feet</H3>
      <p className="text-sm text-foreground/80 leading-relaxed">
        English metre is <strong>accentual-syllabic</strong>: it counts both the number of syllables
        in a line and the pattern of stressed and unstressed syllables. The basic unit is the{" "}
        <strong>foot</strong>. The line is named by its dominant foot and the number of feet it
        contains: <em>iambic pentameter</em> = five iambs.
      </p>
      <Tabla
        cabeceras={["Foot", "Stress pattern", "Example word / phrase", "Source"]}
        filas={[
          [
            "Iamb",
            "u  /  (unstressed–stressed)",
            "«de-LIGHT»",
            "Shakespeare, Sonnet 18: «Shall I com-PARE thee TO a SUM-mer's DAY?»",
          ],
          [
            "Trochee",
            "/  u  (stressed–unstressed)",
            "«TY-ger»",
            "Blake: «TY-ger TY-ger, BURN-ing BRIGHT»",
          ],
          [
            "Anapest",
            "u  u  /",
            "«in-ter-VENE»",
            "Browning: «I sprang to the STIR-rup, and JOR-is, and HE»",
          ],
          [
            "Dactyl",
            "/  u  u",
            "«MER-ri-ly»",
            "Tennyson: «HALF a league, HALF a league, HALF a league ON-ward»",
          ],
          [
            "Spondee",
            "/  /  (two stresses)",
            "«BREAK, BREAK»",
            "Tennyson: «BREAK, BREAK, BREAK / On thy COLD GRAY STONES, O Sea!»",
          ],
          [
            "Pyrrhic",
            "u  u  (two unstressed)",
            "«of the»",
            "Often paired with a following spondee, especially in Shakespeare.",
          ],
        ]}
      />
      <p className="text-sm text-foreground/80 leading-relaxed mt-2">
        Lines are named by foot count: <em>monometer</em> (1), <em>dimeter</em> (2),
        <em> trimeter</em> (3), <em>tetrameter</em> (4), <em>pentameter</em> (5),
        <em> hexameter</em> (6). The two workhorses are <strong>iambic pentameter</strong>
        (Shakespeare's sonnets and dramatic verse, Milton's <em>Paradise Lost</em>, Wordsworth's{" "}
        <em>Prelude</em>) and <strong>iambic tetrameter</strong> (Marvell's
        <em> "To His Coy Mistress"</em>, much hymn and ballad measure).
      </p>

      <H3>Scansion in practice</H3>
      <p className="text-sm text-foreground/80 leading-relaxed">
        To <strong>scan</strong> a line, mark each syllable as stressed (/) or unstressed (u), then
        divide it into feet. Take Shakespeare, Sonnet 18, line 1:
      </p>
      <p className="text-sm text-foreground/80 leading-relaxed font-mono">
        u / u / u / u / u /<br />
        Shall I | com-PARE | thee TO | a SUM | mer's DAY?
      </p>
      <p className="text-sm text-foreground/80 leading-relaxed mt-2">
        Five iambs: regular iambic pentameter. The interest in scansion is almost always where the
        line <em>departs</em> from its expected pattern. A trochaic substitution at the start of a
        line (a stressed syllable where we expected an unstressed one) jolts the reader; a spondee
        (two stresses together) slows the line and weights it with feeling. Always ask:{" "}
        <em>why does the rhythm break here?</em>
      </p>

      <H3>Rhyme: types and effects</H3>
      <Tabla
        cabeceras={["Type of rhyme", "Definition", "Example"]}
        filas={[
          [
            "Perfect / full rhyme",
            "Final stressed vowel and everything after it match exactly.",
            "«bright» / «night»; «moon» / «June»",
          ],
          [
            "Slant rhyme (half / near rhyme)",
            "Consonants match but vowels do not, or vice versa.",
            "Dickinson: «soul» / «all»; Owen: «hall» / «hell»",
          ],
          [
            "Eye rhyme",
            "Words look as though they should rhyme but do not in modern pronunciation.",
            "«love» / «move»; «prove» / «love»",
          ],
          [
            "Internal rhyme",
            "A rhyme inside a single line, between a mid-line word and the line ending.",
            "Coleridge: «The fair BREEZE blew, the white FOAM flew»",
          ],
          [
            "End rhyme",
            "Rhyme at the ends of lines (the default English rhyme position).",
            "Frost: «I have been one acquainted with the NIGHT… / I have walked out in rain — and back in RAIN.»",
          ],
          [
            "Masculine / feminine",
            "Masculine: rhyme on a single stressed syllable. Feminine: rhyme on stressed + unstressed.",
            "Masc.: «day» / «say». Fem.: «motion» / «ocean».",
          ],
        ]}
      />
      <p className="text-sm text-foreground/80 leading-relaxed mt-2">
        Rhyme schemes are noted with letters: the first rhyme sound is <em>a</em>, the second
        <em> b</em>, and so on. <em>"Tyger Tyger, burning bright / In the forests of the night"</em>
        is <em>aa</em>; the Shakespearean sonnet is ABAB CDCD EFEF GG.
      </p>

      <H3>Stanza forms</H3>
      <Tabla
        cabeceras={["Form", "Lines", "Typical scheme", "Example"]}
        filas={[
          ["Couplet", "2", "AA", "Pope's heroic couplets; Shakespeare's sonnet endings."],
          [
            "Tercet / triplet",
            "3",
            "AAA or ABA",
            "Frost, «Acquainted with the Night» (terza rima ABA BCB…).",
          ],
          [
            "Quatrain",
            "4",
            "ABAB, ABBA, AABB, ABCB",
            "Ballad stanza (ABCB); Gray's <em>Elegy</em> (ABAB).",
          ],
          ["Sestet", "6", "Various (e.g. CDECDE)", "The closing six lines of a Petrarchan sonnet."],
          ["Octave", "8", "ABBAABBA", "The opening eight lines of a Petrarchan sonnet."],
          [
            "Spenserian stanza",
            "9",
            "ABABBCBCC",
            "Spenser, <em>The Faerie Queene</em>; Keats, <em>The Eve of St Agnes</em>.",
          ],
        ]}
      />

      <H3>End-stopped lines and enjambment</H3>
      <Def titulo="End-stopped">
        The line ends with a syntactic and metrical pause: a comma, a semicolon, a full stop.
        Shakespeare's sonnets are largely end-stopped, which makes each line feel weighed and
        complete:{" "}
        <em>
          «Shall I compare thee to a summer's day? / Thou art more lovely and more temperate.»
        </em>
      </Def>
      <Def titulo="Enjambment">
        The syntax runs over the line ending without pause; the line break cuts a phrase in two. The
        reader is pulled forward, sometimes producing a momentary ambiguity that the next line
        resolves. Milton, <em>Paradise Lost</em>, opens with twenty-six lines of unrhymed enjambed
        pentameter so that the verse imitates the unstoppable flow of an epic argument:{" "}
        <em>«Of Man's first disobedience, and the fruit / Of that forbidden tree…»</em>.
      </Def>

      <H3>The sonnet</H3>
      <p className="text-sm text-foreground/80 leading-relaxed">
        A 14-line poem in iambic pentameter, organised by a turn or <strong>volta</strong>. Two main
        traditions in English:
      </p>
      <Tabla
        cabeceras={["Form", "Structure", "Rhyme scheme", "Volta", "Canonical example"]}
        filas={[
          [
            "Petrarchan / Italian",
            "Octave + sestet",
            "ABBA ABBA  CDE CDE (or CDC DCD)",
            "At line 9: the sestet answers, qualifies or resolves the octave.",
            "Wordsworth, «Composed upon Westminster Bridge, September 3, 1802»",
          ],
          [
            "Shakespearean / English",
            "Three quatrains + closing couplet",
            "ABAB CDCD EFEF GG",
            "Often at line 9, almost always reinforced or reversed by the couplet at lines 13–14.",
            "Shakespeare, Sonnet 18 («Shall I compare thee…»); Sonnet 73 («That time of year…»)",
          ],
          [
            "Spenserian",
            "Three quatrains linked by rhyme + couplet",
            "ABAB BCBC CDCD EE",
            "As in the Shakespearean.",
            "Spenser, <em>Amoretti</em>",
          ],
          [
            "Modern / variant",
            "14 lines but loosened metre or rhyme",
            "Variable; sometimes near-rhyme only",
            "Often delayed or destabilised.",
            "Hopkins, «The Windhover»; Heaney, <em>Glanmore Sonnets</em>; Millay, «What lips my lips have kissed».",
          ],
        ]}
      />
      <p className="text-sm text-foreground/80 leading-relaxed mt-2">
        Shakespeare, Sonnet 18:{" "}
        <em>
          «Shall I compare thee to a summer's day? / Thou art more lovely and more temperate: /
          Rough winds do shake the darling buds of May, / And summer's lease hath all too short a
          date.»
        </em>{" "}
        Three quatrains develop the comparison; the closing couplet —
        <em>
          «So long as men can breathe, or eyes can see, / So long lives this, and this gives life to
          thee»
        </em>
        — resolves it by claiming poetic immortality.
      </p>

      <H3>The ballad</H3>
      <Def titulo="Definition">
        A narrative poem, traditionally anonymous and oral, that tells a story (often violent or
        supernatural) in <strong>ballad stanzas</strong>: quatrains in alternating tetrameter and
        trimeter, rhyming ABCB, with a refrain that varies or accumulates meaning across the poem.
      </Def>
      <p className="text-sm text-foreground/80 leading-relaxed mt-2">
        Traditional examples: <em>"Sir Patrick Spens"</em>, <em>"The Wife of Usher's Well"</em>. The
        Romantics revive the form as the <strong>literary ballad</strong>: Coleridge's
        <em> "Rime of the Ancient Mariner"</em> uses the simplicity of ballad measure to carry a
        dense symbolic argument. Auden's <em>"As I Walked Out One Evening"</em> and{" "}
        <em>"Stop all the clocks"</em> show how a 20th-century poet can use ballad rhythm for irony
        and elegy.
      </p>

      <H3>Free verse</H3>
      <p className="text-sm text-foreground/80 leading-relaxed">
        Verse without a fixed metre or rhyme scheme. It is not the absence of form: a free-verse
        poem still organises rhythm, but through the <strong>line break</strong>, syntactic
        parallelism, repetition, the shape of the breath. Whitman's long catalogues (
        <em>"Song of Myself"</em>) drive forward by anaphora; Eliot's{" "}
        <em>"The Love Song of J. Alfred Prufrock"</em> moves between irregular pentameter and
        conversational free verse; William Carlos Williams's <em>"The Red Wheelbarrow"</em> hangs
        almost everything on where the lines break.
      </p>
      <p className="text-sm text-foreground/80 leading-relaxed mt-2">
        Always ask of free verse: <em>why end the line here?</em> A line break in free verse is the
        closest thing the poet has to punctuation that the eye can hear.
      </p>

      <TipIB isEN>
        Form is meaning. Do not just <em>identify</em> a Shakespearean sonnet, an iambic pentameter
        or an enjambment; ask <strong>why this form, this metre, this break in the rhythm?</strong>{" "}
        A trochaic substitution at the start of a Shakespeare line, a slant rhyme where we expected
        a perfect one, an enjambment that cuts a phrase in two — these are interpretive
        opportunities. The strongest Paper 1 commentaries use formal observation as evidence for a
        reading, never as decoration.
      </TipIB>
    </div>
  );
}

function contenidoNarratologiaEN() {
  return (
    <div className="space-y-5">
      <p className="text-sm text-foreground/80 leading-relaxed">
        Narratology is the discipline that studies the structure and functioning of stories. It
        distinguishes between <strong>what</strong> is told (story) and <strong>how</strong> it is
        told (discourse). Mastering this distinction is essential for prose analysis in Paper 1.
      </p>

      {/* 1. Story vs Discourse */}
      <H3>Story and discourse</H3>
      <div className="space-y-3">
        <Def titulo="Story (fabula: the events as they would have happened)">
          The logical and chronological sequence of events as they would have occurred in reality.
          It is the «what»: the facts in their natural order.
        </Def>
        <Def titulo="Discourse (sjuzhet: the arrangement of those events in the text)">
          The way those events are presented to the reader: the chosen order, pace, point of view,
          and devices. It is the «how»: the artistic construction of the narrative.
        </Def>
      </div>
      <p className="text-sm text-foreground/80 leading-relaxed">
        The same set of facts can be told in radically different ways. In Faulkner's «A Rose for
        Emily», the narrator scrambles the chronology of Emily Grierson's life so that the final
        revelation reframes everything that came before; the story (her life in order) and the
        discourse (the order of telling) are deliberately misaligned. Narratological analysis
        consists of comparing the two: why begin at the end? Why withhold this detail? What effect
        does that arrangement produce on the reader?
      </p>

      {/* 2. Narrator, narratee, fictional pact */}
      <H3>Narrator, narratee and fictional pact</H3>
      <div className="space-y-3">
        <Def titulo="Narrator">
          The textual instance that tells the story. It is not the author: it is a voice constructed
          by the text. It can be reliable or unreliable, close or distant, omniscient or limited.
          Marlow in Conrad's <em>Heart of Darkness</em> is a narrator; Conrad is the author.
        </Def>
        <Def titulo="Narratee">
          The implicit recipient to whom the narrator speaks within the text. It is not the real
          reader, but a constructed figure: the «dear reader» addressed by Charlotte Brontë's Jane
          Eyre, the silent listeners on the deck of the Nellie in <em>Heart of Darkness</em>, the
          unnamed «you» of an epistolary novel. Identifying the narratee reveals a great deal about
          tone and rhetorical strategy.
        </Def>
        <Def titulo="Fictional pact (suspension of disbelief)">
          A tacit agreement between text and reader: we accept the conventions of the narrated
          world. The omniscient narrator who knows the innermost thoughts of every character is
          implausible in real life, but the fictional pact makes it acceptable. When a text
          deliberately breaks that pact (metafiction in Sterne, the unreliable narrator in Nabokov)
          the effect is unsettling, ironic or revealing.
        </Def>
      </div>

      {/* 3. The action */}
      <H3>The action: structure and techniques</H3>
      <div className="space-y-3">
        <Def titulo="In medias res (in the middle of things)">
          The narrative begins in the middle of the action, with no prior introduction. Homer's
          <em> Iliad</em> opens in the tenth year of the Trojan War; the <em>Odyssey</em> begins
          long after Troy has fallen, with Odysseus already stranded. The technique forces the
          reader to reconstruct the context and creates immediate immersion.
        </Def>
        <Def titulo="In extrema res (at the very end)">
          The narrative begins directly at the climax or denouement and then loops back. Joyce's
          short story «The Dead» drives towards Gabriel's final epiphany; many modernist works place
          revelation early so that the reader rereads the text in its light. The effect is inverted
          expectation: we know the outcome, but not how it was reached.
        </Def>
        <Def titulo="Open ending">
          The text ends without resolving its central tension. Beckett's <em>Waiting for Godot</em>{" "}
          closes with «Yes, let's go» followed by the stage direction «They do not move»: the
          arrival, the meaning, the resolution never come. The reader (or audience) must complete
          the meaning. Effect: ambiguity, an invitation to interpretation, mimesis of a life without
          tidy closure.
        </Def>
        <Def titulo="Digression">
          An interruption of the narrative thread to include reflections, descriptions or secondary
          stories. Sterne's <em>Tristram Shandy</em> turns digression into method: the narrator
          cannot tell his own life because every association leads him elsewhere. Digression can be
          decorative, symbolic, or functionally retarding (delaying the climax).
        </Def>
        <Def titulo="Counterpoint">
          Alternation between two or more simultaneous narrative lines that illuminate each other
          through contrast or parallelism. Dickens's <em>Bleak House</em> alternates between Esther
          Summerson's first-person account and an omniscient present-tense narrator; Woolf's
          <em> Mrs Dalloway</em> braids Clarissa's day with Septimus's collapse. A cinematic
          technique avant la lettre, adapted to prose.
        </Def>
      </div>

      {/* 4. Description */}
      <H3>Description</H3>
      <div className="space-y-3">
        <Def titulo="Prosopography (physical description)">
          Description of a character's physical appearance: features, build, clothing, gestures.
          When Austen tells us that Mr Darcy is «tall» and has «fine, tall person, handsome
          features, noble mien», every detail does ideological work: height and bearing signal class
          as much as body. In the IB, analyse what the narrator selects and why.
        </Def>
        <Def titulo="Ethopoeia (moral description)">
          Description of a character's character, values, behaviour and inner world. Hardy's Tess is
          introduced through her «mobile peony mouth and large innocent eyes», but her ethos emerges
          through gesture and choice rather than catalogue. Dickensian caricatures (Uriah Heep's
          «'umble» self-presentation, Pecksniff's hypocrisy) compress ethopoeia into a single
          repeated tic.
        </Def>
      </div>
      <p className="text-sm text-foreground/80 leading-relaxed">
        Descriptions fulfil four narrative functions:
      </p>
      <Tabla
        cabeceras={["Function", "What it does", "Effect"]}
        filas={[
          [
            "Dilatory",
            "Halts the progress of the action in order to describe",
            "Creates suspense, delays the climax, gives the reader time to orient themselves",
          ],
          [
            "Demarcative",
            "Marks a change of scene, time or perspective",
            "Signals transitions; organizes the structure of the narrative",
          ],
          [
            "Symbolic",
            "The described object or place stands for something else",
            "Condenses meaning; turns details into metaphors of the theme",
          ],
          [
            "Decorative",
            "Sets a scene without a direct structural function",
            "Creates atmosphere, verisimilitude, aesthetic pleasure",
          ],
        ]}
      />

      {/* 5. Narrative time */}
      <H3>Narrative time</H3>
      <div className="space-y-3">
        <Def titulo="External time">
          The historical period in which the story is set (era, year, sociopolitical context). It
          can be explicit (the Dublin of 16 June 1904 in <em>Ulysses</em>) or reconstructible from
          cultural references (the post-war London of <em>Mrs Dalloway</em>).
        </Def>
        <Def titulo="Internal time">
          The duration and internal organization of the narrative: how much time it spans, how that
          duration is distributed across the text, which moments are dilated and which are
          compressed. Joyce gives an entire chapter to a few minutes of Bloom's wandering thoughts;
          Dickens may dispatch a decade in a paragraph.
        </Def>
      </div>
      <p className="text-sm text-foreground/80 leading-relaxed font-medium">
        Anachronies (alterations of chronological order):
      </p>
      <div className="space-y-3">
        <Def titulo="Analepsis (flashback: a return to the past)">
          The narrative goes back to recount something prior to the present of the story. Faulkner's{" "}
          <em>The Sound and the Fury</em> is built almost entirely from analepses: Benjy's section
          moves between decades within a single sentence, triggered by sensation rather than
          chronology. Effect: explaining the origin of a conflict, contrasting past and present,
          revealing withheld information to create suspense.
        </Def>
        <Def titulo="Prolepsis (flashforward: an anticipation of the future)">
          The narrative anticipates future events. Dickens's <em>A Tale of Two Cities</em> closes
          with Sydney Carton's prolepsis («It is a far, far better thing that I do…»), in which the
          narrator projects the future France beyond Carton's death. Effect: it installs a sense of
          fatality or consolation; the reader is granted knowledge the characters do not possess.
        </Def>
      </div>
      <p className="text-sm text-foreground/80 leading-relaxed font-medium mt-3">
        Anisochronies (narrative pace): the relationship between story time and text space
      </p>
      <Tabla
        cabeceras={["Mode", "Definition", "Typical effect"]}
        filas={[
          [
            "Scene",
            "Story time and discourse time are roughly equivalent (dialogue, direct action)",
            "Immersion; the reader experiences events in real time, as in a Hemingway exchange",
          ],
          [
            "Summary",
            "Years are condensed into a few lines, as in the leaps between chapters of Eliot's «Middlemarch»",
            "Accelerates the narration; skips the irrelevant; gives broad temporal perspective",
          ],
          [
            "Pause",
            "The action stops for a description or reflection (Joyce's slow-time chapters; the long Hardy landscapes)",
            "Emphasizes an element; creates atmosphere; dilates time",
          ],
          [
            "Ellipsis",
            "A period is omitted without being mentioned (the gap between sections of «To the Lighthouse»: ten years pass in a parenthesis)",
            "The reader must infer what happened; can create mystery or quicken the pace",
          ],
          [
            "Paralipsis",
            "Relevant information that should have been given is deliberately omitted (the narrator of «The Murder of Roger Ackroyd» withholds his own role)",
            "Unreliable or strategically selective narrator; generates suspense or ambiguity",
          ],
        ]}
      />

      {/* 6. Space */}
      <H3>Narrative space</H3>
      <div className="space-y-3">
        <Def titulo="Objective space">
          The place described in an observable, concrete way, without overt emotional filtering. The
          opening rooms of a Henry James novel are often introduced through measured, inventory-like
          detail before the consciousness of a character reshapes them.
        </Def>
        <Def titulo="Subjective space (reflective space)">
          Space filtered through the consciousness or emotional state of the character. The same
          house may be a refuge or a prison depending on the perceiver. Brontë's Wuthering Heights
          is at once a building, a name, and a state of mind: Heathcliff and Catherine cannot be
          separated from the moors that shape and mirror them.
        </Def>
        <Def titulo="Atmospheric space">
          The environment that determines or conditions the psychology of the characters and the
          development of the action. Conrad's jungle in <em>Heart of Darkness</em> is not a
          backdrop: it presses on Marlow until the line between observer and observed dissolves.
          Eliot's fragmented cityscape in <em>The Waste Land</em> and Faulkner's decaying American
          South operate similarly: place is destiny.
        </Def>
      </div>
      <TipIB isEN>
        When you analyse space, always ask: what does this place represent beyond its literal
        function? The moors are passion and lawlessness; Conrad's river is the journey into the
        self; Faulkner's South is history weighing on the present. Narrative space is rarely neutral
        in literary texts of quality.
      </TipIB>

      {/* 7. Characters */}
      <H3>Characters</H3>
      <p className="text-sm text-foreground/80 leading-relaxed">
        Characters can be classified according to their presence in the text and according to their
        complexity:
      </p>
      <Tabla
        cabeceras={["By appearance", "Description"]}
        filas={[
          ["Protagonist", "Centre of the action; the story revolves around them"],
          ["Antagonist", "Opposes the protagonist; generates the main conflict"],
          ["Secondary character", "Supports or complicates the plot; may have their own arc"],
          ["Episodic character", "Appears briefly; punctual or symbolic function"],
          ["Collective character", "A group that acts as a unit (a community, a family, a crowd)"],
        ]}
      />
      <Tabla
        cabeceras={["By characterization (E.M. Forster)", "Description"]}
        filas={[
          [
            "Flat",
            "Defined by a single dominant trait; predictable; without evolution. Functions as archetype or symbol. Most of Dickens's minor figures (Mrs Jellyby, Mr Micawber) are flat in Forster's sense, and powerfully so.",
          ],
          [
            "Round",
            "Complex, contradictory, capable of surprising the reader. Evolves throughout the narrative. Psychological mimesis. Austen's Emma Woodhouse misjudges, learns, and is reshaped by her own errors: a paradigmatic round character.",
          ],
        ]}
      />
      <div className="space-y-3 mt-3">
        <Def titulo="Interior monologue">
          Direct reproduction of a character's flow of thought, generally in the first person and
          present tense. It shows the mind as it thinks: without narrative filter, with free
          associations. The closing «Penelope» episode of Joyce's <em>Ulysses</em> is the textbook
          example: Molly Bloom's eight unpunctuated «sentences» reproduce her thought as it unfolds
          in bed.
        </Def>
        <Def titulo="Stream of consciousness">
          A narrative technique more radical than interior monologue: it reproduces fragmented,
          prelinguistic, associative thought, including sensory perceptions and involuntary memory.
          Punctuation becomes conventional or disappears. Woolf's <em>Mrs Dalloway</em> slips
          between Clarissa's, Peter's and Septimus's minds within a single paragraph; Faulkner's
          Benjy in <em>The Sound and the Fury</em> registers the world as a flow of sensations
          untethered from time. Effect: maximum immersion in the character's subjectivity.
        </Def>
      </div>
      <p className="text-sm text-foreground/80 leading-relaxed">
        A character's attributes include: name (significant or neutral?), physical traits
        (prosopography), psychological traits (ethopoeia), function in the plot, relationships with
        other characters, and symbolic value.
      </p>

      {/* 8. The narrator: point of view */}
      <H3>The narrator and point of view</H3>
      <p className="text-sm text-foreground/80 leading-relaxed font-medium">
        The narrator's participation in the story (Genette):
      </p>
      <Tabla
        cabeceras={["Type", "Definition", "Grammatical person"]}
        filas={[
          [
            "Heterodiegetic",
            "The narrator is not a character in the story being told. External, outside the fabula. Austen's narrator in «Pride and Prejudice»; Dickens's omniscient voice.",
            "3rd person",
          ],
          [
            "Homodiegetic",
            "The narrator participates in the story being told. May be witness rather than protagonist: Marlow in Conrad's «Heart of Darkness» tells Kurtz's story while remaining a secondary actor; Nick Carraway frames Gatsby's.",
            "1st person",
          ],
          [
            "Autodiegetic",
            "Homodiegetic variant: the narrator is the absolute protagonist of their own narrative. Brontë's Jane Eyre; Dickens's Pip in «Great Expectations»; Nabokov's Humbert Humbert in «Lolita».",
            "1st person",
          ],
        ]}
      />
      <p className="text-sm text-foreground/80 leading-relaxed font-medium mt-3">
        Reliable and unreliable narrators:
      </p>
      <div className="space-y-3">
        <Def titulo="Reliable narrator">
          The reader has no reason to doubt the narrator's account. Discrepancies, when they occur,
          can be attributed to perspective rather than distortion.
        </Def>
        <Def titulo="Unreliable narrator">
          The narrator's account is undermined by self-interest, limited understanding, mental
          state, or active deception. Nabokov's Humbert seduces the reader with elegant prose while
          narrating a crime; the governess of James's <em>The Turn of the Screw</em> may be a
          clear-eyed witness or a hallucinating one. Identifying the textual signals of
          unreliability — contradictions, gaps, suspicious self-justification — is high-value
          analysis in Paper 1.
        </Def>
      </div>
      <p className="text-sm text-foreground/80 leading-relaxed font-medium mt-3">
        The narrator's temporal perspective:
      </p>
      <div className="space-y-3">
        <Def titulo="Simultaneous perspective">
          The narrator recounts events as they occur. Effect of immediacy and uncertainty; the
          narrator does not know how it will end.
        </Def>
        <Def titulo="Retrospective perspective">
          The narrator tells the story from after the events, looking back. Pip in{" "}
          <em>Great Expectations</em> narrates from adulthood the misjudgements of his youth: there
          is irony between what the boy believed and what the man knows.
        </Def>
        <Def titulo="Prospective perspective">
          The narrator anticipates what is going to happen, projecting from the present toward the
          future. Creates expectation and at times fatalism.
        </Def>
      </div>
      <p className="text-sm text-foreground/80 leading-relaxed font-medium mt-3">
        Focalization (Genette): who perceives, not who speaks
      </p>
      <Tabla
        cabeceras={["Focalization", "What it knows / perceives", "Effect"]}
        filas={[
          [
            "Zero (omniscient narrator)",
            "Has access to all thoughts, pasts and futures of every character. The narrator knows more than any character. Dickens, Eliot, Thackeray.",
            "Total authority; sense of order and control; typical of the nineteenth-century novel",
          ],
          [
            "Internal fixed",
            "Adopts the perspective of a single character throughout the narrative. Knows only what that character knows. Henry James's «What Maisie Knew» restricts itself to a child's understanding.",
            "Intimacy with a single point of view; the reader shares its limitations and biases",
          ],
          [
            "Internal variable",
            "Adopts in turn the perspective of different characters in different parts of the text. Faulkner's «The Sound and the Fury» rotates between Benjy, Quentin and Jason; Woolf's «Mrs Dalloway» glides between minds.",
            "Polyphonic vision; the reader compares perspectives and constructs a more complex truth",
          ],
          [
            "External (objective narrator)",
            "Records only the observable: actions, words, gestures. Does not access any mind. Hemingway's «Hills Like White Elephants» is the canonical English-language example.",
            "Documentary or behaviourist effect; the reader must infer emotions and intentions",
          ],
          [
            "Perspectivism",
            "Variant of variable focalization: the same story is told from opposing points of view that contradict each other. Faulkner's «As I Lay Dying» gives fifteen voices to a single funeral journey.",
            "Epistemic relativism; no single version is «the truth»",
          ],
        ]}
      />
      <p className="text-sm text-foreground/80 leading-relaxed font-medium mt-3">
        The narrator's intervention in discourse:
      </p>
      <div className="space-y-3">
        <Def titulo="Subjective narrator">
          Comments, evaluates, judges or ironizes about the events and characters being narrated.
          Their voice is visible and ideologically marks the narrative — think of the wry omniscient
          voice of Austen or Thackeray.
        </Def>
        <Def titulo="Objective narrator (behaviourist)">
          Limits themselves to recording observable facts without evaluating or interpreting.
          Resembles a camera or a report; Hemingway's iceberg style is the textbook case. The reader
          draws their own conclusions from gesture and dialogue alone.
        </Def>
      </div>

      {/* 9. Discourse styles */}
      <H3>Styles of speech and thought representation</H3>
      <Tabla
        cabeceras={["Style", "Features", "Example"]}
        filas={[
          [
            "Direct speech",
            "The character's words are reproduced verbatim, with quotation marks and a reporting verb (verbum dicendi: a verb of saying).",
            "«I want to leave», she said.",
          ],
          [
            "Indirect speech",
            "The narrator reformulates the character's words. Shift in person and verb tense. No quotation marks.",
            "She said that she wanted to leave.",
          ],
          [
            "Free indirect speech",
            "The character's words or thoughts are integrated into the narrator's voice without a reporting verb or quotation marks. The two voices merge.",
            "Why stay? There was nothing to keep her there.",
          ],
        ]}
      />
      <p className="text-sm text-foreground/80 leading-relaxed">
        <strong>Free indirect speech</strong> is the most sophisticated and the most frequent in
        modern narrative. Austen is its great early practitioner — the celebrated opening «It is a
        truth universally acknowledged, that a single man in possession of a good fortune, must be
        in want of a wife» is delivered as if by the narrator, but voices the prejudices of the
        Bennet milieu. Joyce and Woolf push the technique further. Its main effect is ambiguity: it
        is not always clear whether the speaker is the narrator or the character. Identifying free
        indirect speech in a passage and explaining its effect is an IB-level response.
      </p>

      {/* 10. Linguistic aspects */}
      <H3>Linguistic aspects of narrative discourse</H3>
      <div className="space-y-3">
        <Def titulo="Hypotaxis (subordinated syntax)">
          A subordinated syntactic construction: complex sentences linked by connectors (because,
          although, when, even though…). Reflects elaborated thought, causality, nuance. The long,
          embedded periods of Henry James — sentences that gather qualifications before delivering
          their verb — are the paradigm of literary hypotaxis in English.
        </Def>
        <Def titulo="Parataxis (coordinated or juxtaposed syntax)">
          A coordinated or juxtaposed syntactic construction: short sentences, few subordinates,
          choppy rhythm. Hemingway's «He was an old man who fished alone in a skiff in the Gulf
          Stream and he had gone eighty-four days now without taking a fish» is paratactic in spirit
          even where «and» binds the clauses. Creates immediacy, urgency or simplicity;
          characteristic of minimalism and of certain unsophisticated narrators.
        </Def>
      </div>
      <p className="text-sm text-foreground/80 leading-relaxed font-medium">
        Verb tenses and their narrative function:
      </p>
      <Tabla
        cabeceras={["Verb tense", "Narrative use", "Effect"]}
        filas={[
          [
            "Simple past / preterite (he walked)",
            "Completed past action; base tense of most English narrative",
            "Advances the action; establishes temporal distance between narrator and event",
          ],
          [
            "Past progressive (he was walking)",
            "Past action that is durative or in the background",
            "Description, atmosphere, ongoing state; slows the narration and frames scene",
          ],
          [
            "Historical present (he walks)",
            "Past events narrated in the present tense, increasingly common in modern fiction (Hilary Mantel's «Wolf Hall», much contemporary short story)",
            "Vividness, immediacy, drama; collapses the distance between reader and event",
          ],
          [
            "Past perfect / pluperfect (he had walked)",
            "Anteriority with respect to another past time",
            "Marks analepsis; signals chronological anteriority and layered memory",
          ],
        ]}
      />

      <TipIB isEN>
        In a Paper 1 commentary, naming the device matters far less than analysing how the choice of
        focalization, tense or syntactic style produces its specific effect on the reader. Do not
        stop at «the narrator is unreliable» or «the syntax is paratactic»: explain what that choice
        withholds, what it foregrounds, and how it interacts with the passage's theme and tone.
        Always relate point of view, style of speech representation and verb tense as a coherent
        system of authorial decisions.
      </TipIB>
    </div>
  );
}

function contenidoTeatroEN() {
  return (
    <div className="space-y-5">
      <p className="text-sm text-foreground/80 leading-relaxed">
        Theatre is the most demanding genre to analyse on Paper 1 because the text on the page is
        not the finished work: it is a script designed for performance. A visual, spatial and sonic
        dimension hovers behind every line, and your analysis must engage with it even when the play
        is read silently.
      </p>

      <H3>Origins: Greek tragedy and the Dionysia</H3>
      <p className="text-sm text-foreground/80 leading-relaxed">
        Western theatre was born in ancient Greece as a religious ritual in honour of{" "}
        <strong>Dionysus</strong>, god of wine, fertility and ecstasy. The two great festivals were
        the <strong>Lenaia</strong> (winter, comedy) and the <strong>Great Dionysia</strong>{" "}
        (spring, tragedy). Attending was a civic and religious act, not mere entertainment: the
        entire city gathered to watch the performances.
      </p>
      <p className="text-sm text-foreground/80 leading-relaxed mt-2">
        The formal origin of theatre is attributed to <strong>Thespis</strong> (6th century BCE),
        who separated an actor from the chorus to create dialogue. Before him existed the{" "}
        <strong>dithyramb</strong>: a choral hymn in honour of Dionysus, from which the first
        dramatic exchanges emerged. The <strong>chorus</strong> remained essential in Greek tragedy:
        it commented on the action, voiced the community and bridged episodes through its odes.
      </p>
      <p className="text-sm text-foreground/80 leading-relaxed mt-2">
        The three canonical Greek tragedians studied in English A in translation are{" "}
        <strong>Aeschylus</strong> (the <em>Oresteia</em>), <strong>Sophocles</strong> (
        <em>Oedipus Rex</em>, <em>Antigone</em>) and <strong>Euripides</strong> (<em>Medea</em>,{" "}
        <em>The Bacchae</em>).
      </p>

      <H3>
        Aristotle and the <em>Poetics</em>
      </H3>
      <p className="text-sm text-foreground/80 leading-relaxed">
        In his <em>Poetics</em> (4th century BCE), Aristotle systematised Greek theatre and provided
        the first analytical categories of Western literature. His vocabulary — <em>Catharsis</em>,{" "}
        <em>Hamartia</em>, the six elements of tragedy — remains active in literary analysis today.
      </p>

      <H3>Aristotle's definition of tragedy</H3>
      <div className="p-4 rounded-lg border border-border bg-muted/30">
        <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground mb-2">
          Definition from the <em>Poetics</em> (Book VI)
        </div>
        <p className="font-serif text-sm text-ink leading-relaxed italic">
          "Tragedy is the imitation of an action that is noble, complete and of a certain magnitude,
          in language embellished with each kind of artistic ornament, presented through characters
          who act and not through narration, and which through pity and fear effects the catharsis
          of such emotions."
        </p>
      </div>

      <H3>The six elements of tragedy</H3>
      <p className="text-sm text-foreground/80 leading-relaxed">
        Aristotle identifies six components, ordered by importance:
      </p>
      <Tabla
        cabeceras={["Greek term", "English gloss", "What it covers"]}
        filas={[
          [
            "Mythos",
            "Plot",
            "The arrangement of events. For Aristotle, the most important element: a tragedy is first and foremost a structured action.",
          ],
          [
            "Ethos",
            "Character",
            "The moral and psychological dispositions revealed through choice. Character emerges from what the figure decides under pressure.",
          ],
          [
            "Dianoia",
            "Thought",
            "The reasoning, themes and arguments expressed through speech. The intellectual content of the play.",
          ],
          [
            "Lexis",
            "Diction",
            "The verbal expression: word choice, register, metre, imagery. In Shakespeare, blank verse vs. prose.",
          ],
          [
            "Melos",
            "Song / music",
            "The lyrical and rhythmic dimension. In Greek tragedy, the choral odes; in modern theatre, sound design and the musicality of speech.",
          ],
          [
            "Opsis",
            "Spectacle",
            "The visual dimension: staging, costume, lighting. Aristotle ranks it last because it depends on the production rather than the text.",
          ],
        ]}
      />

      <H3>Hamartia, Catharsis and Hybris</H3>
      <div className="space-y-3">
        <Def titulo="Hamartia (tragic flaw / error)">
          A flaw of character or an error of judgement that triggers the protagonist's downfall. Not
          a moral vice but a structural weakness that the action exposes.
        </Def>
        <Def titulo="Catharsis (purgation)">
          The emotional purification produced in the audience through pity and fear. Tragedy works
          on us by allowing us to feel intensely and safely.
        </Def>
        <Def titulo="Hybris (overweening pride)">
          Excessive self-confidence that defies the limits set by the gods, fate or moral order.
          Hybris frequently triggers the hamartia.
        </Def>
      </div>
      <p className="text-sm text-foreground/80 leading-relaxed mt-2">
        These categories illuminate the major Shakespearean tragedies:
      </p>
      <Tabla
        cabeceras={["Protagonist", "Hamartia", "How the play exposes it"]}
        filas={[
          [
            "Macbeth",
            "Ambition",
            "His desire for the crown overrides loyalty, conscience and reason. Hybris in his refusal to accept the limits of his station.",
          ],
          [
            "Hamlet",
            "Delay / over-thinking",
            "Hamlet's intellect becomes a paralysis: he cannot translate moral certainty into decisive action.",
          ],
          [
            "Othello",
            "Jealousy and credulity",
            "His readiness to trust Iago over Desdemona transforms love into destructive suspicion.",
          ],
          [
            "Lear",
            "Pride and blindness",
            "Lear cannot read sincerity in those who love him; he rewards flattery and exiles truth, only seeing clearly once stripped of power.",
          ],
        ]}
      />

      <H3>The three unities (action, time, place)</H3>
      <p className="text-sm text-foreground/80 leading-relaxed">
        Drawn from Aristotle's <em>Poetics</em> (and codified more rigidly by Renaissance and
        neoclassical critics), the three unities require:
      </p>
      <div className="space-y-2">
        <Def titulo="Unity of action">A single, coherent plot without unrelated subplots.</Def>
        <Def titulo="Unity of time">The action takes place within roughly twenty-four hours.</Def>
        <Def titulo="Unity of place">The action is confined to a single location.</Def>
      </div>
      <p className="text-sm text-foreground/80 leading-relaxed mt-2">
        Shakespeare frequently disregards them: <em>Antony and Cleopatra</em> spans years and moves
        between Rome, Egypt and Greece; the histories range over decades. Among his works, only{" "}
        <em>The Tempest</em> respects the three unities tightly. The neoclassical Restoration
        playwrights — <strong>Dryden</strong> (<em>All for Love</em>), <strong>Otway</strong> (
        <em>Venice Preserv'd</em>) — re-imposed them under French influence. When you analyse a play
        in Paper 1, asking whether the unities hold or break is often a productive entry point: a
        fractured time-frame or a shifting setting almost always carries thematic weight.
      </p>

      <H3>Shakespeare and English Renaissance theatre</H3>
      <p className="text-sm text-foreground/80 leading-relaxed">
        Where Aristotle prescribed the boundaries between genres, Elizabethan theatre — and{" "}
        <strong>Shakespeare</strong> in particular — mixed them deliberately. His plays move across
        four broad categories:
      </p>
      <Tabla
        cabeceras={["Category", "Examples", "Conventions"]}
        filas={[
          [
            "Histories",
            "Henry V, Richard III, Henry IV Parts 1 & 2",
            "Dramatise English political memory; episodic structure; mix royal speech and tavern prose.",
          ],
          [
            "Tragedies",
            "Hamlet, Macbeth, Othello, King Lear",
            "Centre on a noble protagonist destroyed by a hamartia; high blank verse; supernatural or political pressure.",
          ],
          [
            "Comedies",
            "A Midsummer Night's Dream, Twelfth Night, Much Ado About Nothing",
            "End in marriage and reconciliation; cross-dressing, mistaken identity, rural or festive settings.",
          ],
          [
            "Romances (late plays)",
            "The Tempest, The Winter's Tale, Cymbeline",
            "Tragicomic structure: loss, separation and improbable restoration; magical or pastoral elements.",
          ],
        ]}
      />
      <p className="text-sm text-foreground/80 leading-relaxed mt-2">
        Key conventions of the Elizabethan stage you can name in analysis:{" "}
        <strong>blank verse</strong> (unrhymed iambic pentameter — the default for noble or serious
        speech), <strong>prose</strong> (used for lower-class characters, comic scenes, madness or
        intimacy), the <strong>soliloquy</strong> (a character alone on stage thinking aloud), the{" "}
        <strong>aside</strong> (a remark heard by the audience but not by other characters on
        stage), and the <strong>play-within-a-play</strong> (as in <em>Hamlet</em> or{" "}
        <em>A Midsummer Night's Dream</em>).
      </p>

      <H3>Dramatic irony</H3>
      <p className="text-sm text-foreground/80 leading-relaxed">
        Dramatic irony is the gap between what the character knows and what the audience knows.
        Three forms recur in Anglophone theatre:
      </p>
      <Tabla
        cabeceras={["Type", "Definition", "Anglophone example"]}
        filas={[
          [
            "Tragic irony",
            "The audience knows the protagonist is moving toward catastrophe while the protagonist does not.",
            "Sophocles' Oedipus Rex (in translation): Oedipus pursues the murderer of Laius unaware that he himself is the murderer. In Romeo and Juliet, the audience knows Juliet is alive when Romeo drinks the poison.",
          ],
          [
            "Verbal irony",
            "A character says something whose surface meaning differs from what the audience understands.",
            'Iago repeatedly calls himself "honest Iago" in Othello, the word becoming corrosive each time. Mark Antony\'s "Brutus is an honourable man" in Julius Caesar.',
          ],
          [
            "Situational irony",
            "Events unfold in a way that contradicts the character's expectations or efforts.",
            "Macbeth murders to secure the throne and finds only sleeplessness, paranoia and a tightening prophecy. Lear divides his kingdom to ensure peace and unleashes civil war.",
          ],
        ]}
      />

      <H3>Dramatic structure</H3>
      <p className="text-sm text-foreground/80 leading-relaxed">
        Most Western plays follow the five-part arc codified as <strong>Freytag's pyramid</strong>:
      </p>
      <div className="space-y-2">
        <Def titulo="1. Exposition">Establishes setting, characters and the initial situation.</Def>
        <Def titulo="2. Rising action">
          Conflicts emerge and intensify; the protagonist commits to a course.
        </Def>
        <Def titulo="3. Climax">The decisive turning point; the action's highest pitch.</Def>
        <Def titulo="4. Falling action">
          The consequences of the climax unfold; reversals and recognitions accumulate.
        </Def>
        <Def titulo="5. Denouement / catastrophe">
          Resolution. In tragedy, the protagonist's death and the restoration of order.
        </Def>
      </div>
      <p className="text-sm text-foreground/80 leading-relaxed mt-2">
        Applied to <em>Macbeth</em>: exposition (the witches' prophecy and Macbeth's loyalty);
        rising action (the murder of Duncan and Macbeth's accession); climax (the banquet scene with
        Banquo's ghost — the moment Macbeth's guilt becomes public); falling action (the murders of
        Macduff's family and Lady Macbeth's madness); denouement (Macbeth's death and Malcolm's
        coronation). Modern American drama follows comparable arcs: in Miller's{" "}
        <em>Death of a Salesman</em>, Willy Loman's exposition (return home, fatigue), rising action
        (job loss, Biff's confrontation), climax (the restaurant scene), falling action (the garden)
        and denouement (the suicide and requiem).
      </p>

      <H3>Elements of a dramatic text</H3>
      <div className="space-y-2">
        <Def titulo="Stage direction">
          Authorial instruction printed in the script — never spoken — describing setting, action or
          tone. <strong>Shaw</strong> and <strong>O'Neill</strong> use stage directions extensively,
          almost as novelistic prose, embedding interpretation that the performance can only
          suggest. In Paper 1, stage directions are part of the text and must be analysed.
        </Def>
        <Def titulo="Soliloquy">
          A character alone on stage speaks their thoughts aloud, granting the audience direct
          access to their interior. The two best-known examples in English are Hamlet's "To be, or
          not to be" and Macbeth's "Tomorrow, and tomorrow, and tomorrow" — both dramatise the
          collapse of meaning into a paralysis or a void.
        </Def>
        <Def titulo="Monologue">
          A long uninterrupted speech delivered to other characters on stage (distinct from the
          soliloquy, which is private). Mark Antony's funeral oration in <em>Julius Caesar</em> is a
          monologue that turns a hostile crowd.
        </Def>
        <Def titulo="Aside">
          A brief remark heard by the audience but conventionally inaudible to other characters on
          stage. Shakespearean villains — Iago, Richard III, Edmund — confide their plots to the
          audience through asides, making us complicit.
        </Def>
        <Def titulo="Dialogue">
          The exchange between characters. Pay attention to who speaks, who is silenced, who
          interrupts. Stichomythia (rapid line-by-line exchange) signals confrontation; long
          unbroken speeches signal authority or self-absorption.
        </Def>
      </div>

      <H3>Types of theatrical space</H3>
      <Tabla
        cabeceras={["Type", "Description", "Effect"]}
        filas={[
          [
            "Elizabethan thrust stage",
            'A platform projecting into the audience on three sides. The Globe ("this wooden O", as the Chorus calls it in Henry V) seated up to 3,000 spectators standing or in galleries.',
            "Intimate yet public; soliloquies feel addressed directly to the audience; minimal scenery placed the burden of world-making on language.",
          ],
          [
            "Proscenium arch",
            'A rectangular frame separating audience from stage; the standard "picture frame" theatre from the 17th century onward.',
            "Creates the illusion of a fourth wall; supports realism; audience watches an enclosed world from outside.",
          ],
          [
            "Arena / theatre-in-the-round",
            "Audience surrounds the stage on all sides; common in contemporary and Beckett-influenced productions.",
            "Removes any privileged angle; demands choreography that works from every direction; intensifies exposure.",
          ],
          [
            "Black box",
            "A flexible, neutral interior space, painted black, with movable seating; characteristic of contemporary experimental theatre.",
            "Each production redesigns the actor-audience relation; encourages minimalism and conceptual staging.",
          ],
        ]}
      />
      <p className="text-sm text-foreground/80 leading-relaxed mt-2">
        Spanish theatre history gave us the <em>corral de comedias</em>, an open-air courtyard stage
        roughly contemporary with the Elizabethan playhouse, but for English A purposes the
        Anglophone tradition runs Globe → Restoration playhouse → proscenium → modern flexible
        spaces.
      </p>

      <H3>Lighting and stagecraft</H3>
      <p className="text-sm text-foreground/80 leading-relaxed">
        Until the 19th century, theatres relied on daylight or candles; modern electric lighting
        transformed dramatic possibility. Two modernist directions are worth naming in analysis:
      </p>
      <div className="space-y-2">
        <Def titulo="Beckett's bare stage">
          In <em>Waiting for Godot</em> and <em>Endgame</em>, the stage is stripped to a single
          tree, a bench, a window. The minimalism makes silence and gesture carry meaning that
          dialogue refuses to deliver.
        </Def>
        <Def titulo="Brecht's anti-illusionism (Verfremdungseffekt)">
          Brecht (read in translation in English A) deliberately broke the illusion: visible
          lighting rigs, placards announcing scenes, songs that interrupt the action. The aim was to
          keep the audience critical rather than emotionally absorbed.
        </Def>
      </div>

      <H3>Theatrical genres</H3>
      <Tabla
        cabeceras={["Genre", "Defining trait", "Anglophone examples"]}
        filas={[
          [
            "Tragedy",
            "A serious action ending in the protagonist's downfall; engages pity and fear.",
            "Shakespeare's Hamlet, Macbeth, Othello, King Lear; Marlowe's Doctor Faustus; Miller's Death of a Salesman; O'Neill's Long Day's Journey into Night.",
          ],
          [
            "Comedy",
            "A movement from disorder to harmony, typically ending in marriage or reconciliation.",
            "Shakespeare's Twelfth Night, As You Like It; Restoration comedy: Wycherley's The Country Wife, Sheridan's The School for Scandal; Wilde's The Importance of Being Earnest.",
          ],
          [
            "Drama (broad sense)",
            "Serious work that does not end in catastrophe; explores conflict in psychological or social terms.",
            "Ibsen's A Doll's House (in translation); Chekhov's The Cherry Orchard (in translation); Williams's A Streetcar Named Desire.",
          ],
          [
            "Tragicomedy",
            "Mixes the registers and outcomes of tragedy and comedy; refuses generic resolution.",
            "Shakespeare's late romances (The Winter's Tale, The Tempest); Beckett's Waiting for Godot — explicitly subtitled \"a tragicomedy in two acts\"; Stoppard's Rosencrantz and Guildenstern Are Dead.",
          ],
        ]}
      />

      <H3>Dramatic conflict</H3>
      <p className="text-sm text-foreground/80 leading-relaxed">
        Conflict is the engine of drama. Two broad categories — internal and external — break down
        into four classic axes:
      </p>
      <Tabla
        cabeceras={["Type of conflict", "Description", "Example"]}
        filas={[
          [
            "Person vs. self",
            "An internal struggle between desires, duties or beliefs.",
            "Hamlet's vacillation between revenge and moral hesitation; Willy Loman's quarrel between self-image and reality in Death of a Salesman.",
          ],
          [
            "Person vs. person",
            "A direct clash between two characters whose goals are incompatible.",
            "Othello and Iago; Stanley and Blanche in A Streetcar Named Desire; Antigone and Creon (in translation).",
          ],
          [
            "Person vs. society",
            "The protagonist confronts the norms, institutions or expectations of their world.",
            "Nora in Ibsen's A Doll's House (in translation) breaking from bourgeois marriage; the Younger family in Hansberry's A Raisin in the Sun.",
          ],
          [
            "Person vs. fate",
            "The protagonist resists a force — destiny, prophecy, the gods — that exceeds their agency.",
            "Macbeth and the witches' prophecy; Oedipus and the oracle (in translation).",
          ],
        ]}
      />

      <H3>Brief chronology</H3>
      <Tabla
        cabeceras={["Period", "Approximate dates", "Representative figures"]}
        filas={[
          [
            "Greek theatre",
            "5th century BCE",
            "Aeschylus, Sophocles, Euripides; Aristophanes (comedy).",
          ],
          [
            "Roman theatre",
            "3rd c. BCE – 2nd c. CE",
            "Plautus and Terence (comedy); Seneca (tragedy, hugely influential on Elizabethan drama).",
          ],
          [
            "Medieval mystery and morality plays",
            "12th–16th c.",
            "Anonymous English cycles (York, Wakefield); Everyman.",
          ],
          [
            "Elizabethan and Jacobean theatre",
            "c. 1576–1642",
            "Marlowe, Shakespeare, Jonson, Webster, Middleton.",
          ],
          [
            "Restoration and 18th-century drama",
            "1660–c. 1780",
            "Dryden, Wycherley, Congreve, Sheridan; reopening of the theatres after the Puritan ban.",
          ],
          [
            "Bourgeois and realist drama",
            "19th c.",
            "Ibsen, Chekhov, Strindberg (in translation); Wilde and Shaw in English.",
          ],
          [
            "Modernism and absurdism",
            "Early–mid 20th c.",
            "O'Neill, Brecht (in translation), Beckett, Pinter, Stoppard.",
          ],
          [
            "Contemporary",
            "Late 20th c. – present",
            "Caryl Churchill, August Wilson, Tony Kushner, Sarah Kane, Lynn Nottage.",
          ],
        ]}
      />

      <TipIB isEN>
        When you analyse a dramatic excerpt on Paper 1, three reflexes matter. First,{" "}
        <strong>stage directions are part of the text</strong>: who enters, who exits, what objects
        are present, what tone is indicated. Second,{" "}
        <strong>silence and stage business carry meaning</strong> — a pause in Pinter, a refused
        embrace in Williams, an unanswered question in Beckett can be more eloquent than the
        surrounding dialogue. Third, <strong>dialogue performs identity</strong>: shifts between
        blank verse and prose, formal and casual register, fluent and broken speech are
        character-defining choices. Naming the gap between what is said and what is staged is one of
        the most productive moves you can make.
      </TipIB>
    </div>
  );
}

function contenidoRecursosEN() {
  return (
    <div className="space-y-5">
      <p className="text-sm text-foreground/80 leading-relaxed">
        Identifying a literary device is the starting point, not the goal. The IB does not assess
        whether you can name rhetorical figures: it assesses whether you can explain what they do in
        the text and how they shape its meaning for a reader.
      </p>

      <H3>The INCA structure</H3>
      <p className="text-sm text-foreground/80 leading-relaxed">
        To analyse any device on Paper 1, apply this four-step structure:
      </p>
      <div className="space-y-2">
        <Def titulo="I — Identify">
          Recognise that something is happening in the language. Notice the device before naming it.
        </Def>
        <Def titulo="N — Name">
          Use precise terminology: not "a kind of repetition" but "anaphora"; not "a comparison" but
          "extended metaphor".
        </Def>
        <Def titulo="C — Connect with meaning">
          Tie the device to the thematic stakes of the text. What is it intensifying, contrasting,
          masking or revealing?
        </Def>
        <Def titulo="A — Articulate the effect on the reader">
          What does the device do to us as we read? What feeling, idea or question does it shape?
        </Def>
      </div>

      <p className="text-sm text-foreground/80 leading-relaxed mt-3">
        Worked example with Robert Frost's "The Road Not Taken":
      </p>
      <Tabla
        cabeceras={["Step", "Application to Frost"]}
        filas={[
          [
            "Identify",
            'The speaker says "Two roads diverged in a yellow wood" and elaborates the image across the whole poem.',
          ],
          [
            "Name",
            "The two diverging roads function as an extended metaphor and, by the final stanza, as a symbol for the choices that shape a life.",
          ],
          [
            "Connect with meaning",
            "The metaphor lets Frost stage a small woodland decision as the model of all consequential choices: irrevocable, partly arbitrary, retrospectively narrated.",
          ],
          [
            "Articulate the effect",
            'The reader is invited to retrace their own past choices through the speaker\'s: the famous line "I took the one less traveled by" sounds confident, but the poem\'s tense ("I shall be telling this with a sigh") quietly undermines that confidence, leaving the reader with a more uncomfortable feeling than the popular reading suggests.',
          ],
        ]}
      />

      <H3>Description vs. analysis: the difference on the exam</H3>
      <div className="space-y-3">
        <div className="p-4 rounded-lg border border-rose-300 bg-rose-50/50">
          <div className="text-[10px] uppercase tracking-[0.18em] text-rose-700 mb-2">
            Description (insufficient)
          </div>
          <p className="text-sm text-foreground/80 italic">
            "Plath repeats the word 'black' several times in the poem."
          </p>
        </div>
        <div className="p-4 rounded-lg border border-emerald-300 bg-emerald-50/50">
          <div className="text-[10px] uppercase tracking-[0.18em] text-emerald-700 mb-2">
            Analysis (IB level)
          </div>
          <p className="text-sm text-foreground/80 italic">
            "Plath's repetition of 'black' across consecutive stanzas builds a chromatic
            claustrophobia: the colour spreads from object to object — shoe, telephone, sky — until
            the speaker's world has been entirely overwritten by it. The repetition refuses
            metaphorical variation, as if the speaker can no longer think outside this single shade,
            and the reader experiences her grief less as an idea than as an enclosure."
          </p>
        </div>
      </div>
      <p className="text-sm text-foreground/80 leading-relaxed mt-2">
        The descriptive sentence states a fact about the text. The analytical sentence shows{" "}
        <em>what the fact does</em>: the form of the repetition mirrors the experience the poem is
        staging.
      </p>

      <H3>The five most common mistakes</H3>
      <div className="space-y-2">
        {[
          {
            n: "1",
            titulo: "Listing devices without analysing",
            texto:
              "Cataloguing metaphors, alliterations and enjambments without explaining their effect. The examiner needs to know what each choice does, not that it exists.",
          },
          {
            n: "2",
            titulo: "Paraphrasing the text",
            texto:
              "Retelling what happens in the poem or passage in slightly different words. Paper 1 assesses literary analysis, not summary.",
          },
          {
            n: "3",
            titulo: "Ignoring form",
            texto:
              "Discussing only what the text says and not how it says it. Metre, line breaks, punctuation, paragraph length, stage directions and tense are part of the meaning.",
          },
          {
            n: "4",
            titulo: "Treating the speaker as the author",
            texto:
              'Saying "Plath felt depressed" or "Frost is undecided" collapses the persona into the biography. The IB expects "the speaker", "the lyric voice", "the narrator" — the persona constructed by the text.',
          },
          {
            n: "5",
            titulo: 'Generic claims ("creates emphasis")',
            texto:
              'Phrases like "this creates emphasis", "this makes the reader interested", "this adds beauty" describe nothing specific. Always ask: emphasis on what? interest in what? beauty doing what?',
          },
        ].map((e) => (
          <div key={e.n} className="flex gap-3 p-3 rounded-md border border-border bg-card">
            <span className="text-[11px] font-bold text-muted-foreground mt-0.5 shrink-0 w-4">
              {e.n}
            </span>
            <div>
              <span className="text-sm font-medium text-ink">{e.titulo}. </span>
              <span className="text-sm text-foreground/80">{e.texto}</span>
            </div>
          </div>
        ))}
      </div>

      <H3>Analysis hierarchy</H3>
      <p className="text-sm text-foreground/80 leading-relaxed">
        Strong analysis climbs through four levels. Each level depends on the one below:
      </p>
      <Tabla
        cabeceras={["Level", "What it does", "Example move"]}
        filas={[
          [
            "1. Recognition",
            "Noticing that the language is doing something — that a pattern, a deviation or a charged word is present.",
            '"There is a striking shift in punctuation in the third stanza."',
          ],
          [
            "2. Naming",
            "Using accurate technical terminology to label what you have noticed.",
            '"The poem moves from end-stopped lines to heavy enjambment."',
          ],
          [
            "3. Connecting",
            "Tying the device to the text's larger concerns — its themes, voice, structure.",
            '"The enjambment coincides with the speaker losing control over her grief: form and content begin to spill across the line break together."',
          ],
          [
            "4. Articulating effect",
            "Explaining what the device does to the reader's experience and to meaning-making.",
            '"As a reader, we feel the line refusing to settle; the absence of full stops keeps us inside the speaker\'s racing thought, and we cannot pause where convention says we should."',
          ],
        ]}
      />
      <p className="text-sm text-foreground/80 leading-relaxed mt-2">
        On Paper 1, prioritise devices that operate <strong>systematically</strong> (a recurring
        image of light across Yeats's poem; the gradual loss of full stops in a Plath stanza) over
        those that appear once. A recurring choice is by definition deliberate; an isolated device
        may or may not be load-bearing.
      </p>

      <TipIB isEN>
        Every device analysis should answer one final question: <strong>so what?</strong> What does
        this choice <em>do</em> to the reader's experience of the text? If you cannot finish the
        sentence "this matters to the reader because…", the device is named but not analysed. The
        "so what?" is what separates a Band 3 commentary from a Band 5 one.
      </TipIB>
    </div>
  );
}

function contenidoVocabularioEN() {
  return (
    <div className="space-y-5">
      <p className="text-sm text-foreground/80 leading-relaxed">
        An IB-level literary commentary is distinguished not only by what it says but by{" "}
        <strong>how it says it</strong>. This sheet collects the indispensable vocabulary:
        connectors to structure your argument, verbs to describe what the text actually does,
        adverbs to calibrate your evaluation, and synonyms that prevent the repetitions which weaken
        an essay.
      </p>

      {/* 1. Discourse connectors */}
      <H3>Discourse connectors</H3>
      <p className="text-sm text-foreground/80 leading-relaxed">
        Connectors articulate your reasoning and guide the reader through the argument. Using them
        precisely is a direct indicator of Criterion C (Focus and organization).
      </p>
      <Tabla
        cabeceras={["Function", "Connectors"]}
        filas={[
          [
            "Addition",
            "moreover, furthermore, in addition, additionally, also, similarly, what is more, beyond this",
          ],
          [
            "Contrast",
            "however, nevertheless, on the other hand, by contrast, conversely, yet, still, whereas",
          ],
          ["Cause", "because, since, as, given that, due to, owing to, on account of, insofar as"],
          [
            "Effect / consequence",
            "therefore, consequently, as a result, hence, thus, accordingly, with the result that",
          ],
          [
            "Example / illustration",
            "for instance, for example, namely, in particular, specifically, to illustrate, as seen in",
          ],
          [
            "Sequence / progression",
            "first, next, then, subsequently, finally, ultimately, in turn, at this point",
          ],
          [
            "Concession",
            "although, even though, despite, in spite of, while, granted that, admittedly",
          ],
          [
            "Emphasis",
            "indeed, in fact, notably, crucially, above all, importantly, it is worth noting that",
          ],
          [
            "Conclusion / synthesis",
            "in conclusion, to conclude, in sum, overall, taken together, ultimately, on the whole",
          ],
        ]}
      />

      {/* 2. Analytical verbs */}
      <H3>Analytical verbs</H3>
      <p className="text-sm text-foreground/80 leading-relaxed">
        These verbs describe with precision what the text, the author, or a device is doing. They
        replace the lazy verbs <em>says</em>, <em>talks about</em>, and <em>uses</em>, which flatten
        analysis into summary.
      </p>
      <Tabla
        cabeceras={["Function", "Verbs"]}
        filas={[
          [
            "To present a claim",
            "argues, contends, maintains, asserts, posits, proposes, advances, holds",
          ],
          [
            "To show a device's effect",
            "produces, generates, creates, evokes, conjures, engenders, gives rise to",
          ],
          [
            "To suggest meaning",
            "implies, suggests, intimates, connotes, hints at, gestures toward, points to",
          ],
          [
            "To structure",
            "introduces, develops, foregrounds, juxtaposes, frames, situates, sets up",
          ],
          [
            "To intensify",
            "emphasizes, underscores, heightens, amplifies, reinforces, accentuates, sharpens",
          ],
          [
            "To question / destabilize",
            "challenges, undermines, destabilizes, complicates, problematizes, subverts, unsettles",
          ],
          [
            "To reveal",
            "exposes, reveals, unmasks, lays bare, brings to light, manifests, discloses",
          ],
        ]}
      />

      {/* 3. Evaluative verbs */}
      <H3>Evaluative verbs</H3>
      <p className="text-sm text-foreground/80 leading-relaxed">
        These express analytical judgement: what effect a device achieves and why it matters. They
        are the verbs that lift a paragraph from description to genuine evaluation.
      </p>
      <Tabla
        cabeceras={["Function", "Verbs and expressions"]}
        filas={[
          [
            "Effective",
            "succeeds in, achieves, accomplishes, captures, conveys, brings off, lands",
          ],
          [
            "Skillful",
            "skillfully, deftly, masterfully, with precision, with control, with assurance",
          ],
          [
            "Sophisticated",
            "nuances, complicates, refines, balances, sustains, modulates, calibrates",
          ],
          [
            "Innovative",
            "subverts, reinvents, departs from, unsettles, transforms, reworks, reimagines",
          ],
          [
            "Limited",
            "falls short of, fails to fully, remains tentative, only partially achieves, gestures at without sustaining",
          ],
        ]}
      />

      {/* 4. Evaluative adverbs and expressions */}
      <H3>Evaluative adverbs and expressions</H3>
      <p className="text-sm text-foreground/80 leading-relaxed">
        These calibrate the strength of your claim and prevent absolute or simplistic statements
        ("the poem says life is sad"). They signal that you are reading carefully, not flatly.
      </p>
      <Tabla
        cabeceras={["Function", "Adverbs and expressions"]}
        filas={[
          [
            "Strong agreement",
            "convincingly, persuasively, compellingly, powerfully, strikingly, unmistakably",
          ],
          [
            "Subtle",
            "subtly, delicately, almost imperceptibly, with restraint, gradually, by degrees",
          ],
          [
            "Effective",
            "effectively, successfully, with notable precision, to telling effect, to powerful effect",
          ],
          [
            "Tentative",
            "arguably, perhaps, in part, to some extent, on one reading, it might be said that",
          ],
          [
            "Limitation",
            "somewhat schematically, at the cost of, less convincingly, with diminishing returns, only loosely",
          ],
          [
            "Significance",
            "tellingly, significantly, crucially, meaningfully, pointedly, revealingly",
          ],
        ]}
      />

      {/* 5. Indispensable synonyms */}
      <H3>Indispensable synonyms</H3>
      <p className="text-sm text-foreground/80 leading-relaxed">
        Words that get overused in IB essays and the sharper alternatives that vary your register
        without sacrificing precision.
      </p>
      <Tabla
        cabeceras={["Overused word", "Alternatives with nuance"]}
        filas={[
          [
            "show",
            "reveals, demonstrates, illustrates, exemplifies, manifests, displays, brings out",
          ],
          ["important", "significant, central, pivotal, crucial, essential, defining, decisive"],
          ["idea", "concept, notion, theme, argument, proposition, claim, premise"],
          [
            "different",
            "distinct, divergent, contrasting, alternate, variant, opposed, at odds with",
          ],
          ["use", "employ, deploy, mobilize, draw on, harness, leverage, marshal"],
          ["effect", "impact, consequence, resonance, repercussion, force, influence, charge"],
          ["reader", "audience, addressee, interlocutor, the implied reader, the reader"],
          [
            "speaker (poetry)",
            "lyric speaker, the I, the persona, the speaking voice, the lyric subject",
          ],
          ["text", "work, piece, extract, passage, fragment, text"],
          [
            "strong (effect / argument)",
            "forceful, compelling, robust, emphatic, resonant, weighty, hard-hitting",
          ],
        ]}
      />

      {/* 6. Opening phrases by essay section */}
      <H3>Opening phrases by essay section</H3>
      <p className="text-sm text-foreground/80 leading-relaxed">
        Models for opening each part of your commentary. They are not formulas: adapt them to the
        specific text in front of you.
      </p>
      <Tabla
        cabeceras={["Section", "Opening phrases"]}
        filas={[
          [
            "Introduction (orientation)",
            "The extract, drawn from [author / work], stages… · From its opening lines, the passage establishes… · [Author]'s text invites the reader to…",
          ],
          [
            "Introduction (thesis)",
            "This commentary will argue that… · I will contend that… · This response will demonstrate that…",
          ],
          [
            "Body paragraph (claim)",
            "A first device worth noting is… · The passage's most striking strategy is… · Central to this effect is…",
          ],
          [
            "Body paragraph (transition)",
            "Building on this, the text then… · If [device A] establishes [X], [device B] complicates it by… · This pattern is reinforced when…",
          ],
          [
            "Conclusion",
            "Taken together, these devices… · What emerges from this commentary is… · Read in this light, the extract ultimately…",
          ],
        ]}
      />

      <TipIB isEN>
        The difference between a Band 3 essay and a Band 5 essay often lies in the verbs and
        adverbs. Drop "the author uses metaphors to show" and reach for "the author deploys a
        sustained network of aquatic metaphors that gradually engulfs the speaker." Vary your verbs
        (avoid <em>shows</em>, <em>uses</em>, <em>talks about</em> in every sentence), prefer the
        specific over the general, and let your evaluation be visible in your word choice, not
        bolted on at the end.
      </TipIB>
    </div>
  );
}

const CONTENIDOS: Record<string, (isEN?: boolean) => React.JSX.Element> = {
  movimientos: contenidoMovimientos,
  poesia: contenidoPoesia,
  narratologia: contenidoNarratologia,
  teatro: contenidoTeatro,
  recursos: contenidoRecursos,
  vocabulario: contenidoVocabulario,
  "teoria-literaria": contenidoTeoriaLiteraria,
  topicos: contenidoTopicos,
};

// ── COMPONENTES ──────────────────────────────────────────────

function SeccionDetalle({
  seccion,
  onVolver,
  isEN,
}: {
  seccion: Seccion;
  onVolver: () => void;
  isEN: boolean;
}) {
  const renderContenido = CONTENIDOS[seccion.id];

  return (
    <div id="teoria-root" className="min-h-screen" style={teoriaRootStyle}>
      <TeoriaScopedStyles />
      <SiteHeader claro />
      <main className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onVolver}
          className="lib-press mb-6 rounded-xl"
          style={{ color: L.primary }}
        >
          <ChevronLeft aria-hidden="true" className="h-4 w-4" />
          {isEN ? "Back to theory" : "Volver a la teoría"}
        </Button>

        <div className="lib-reveal mb-6">
          <span
            className="mb-3 inline-block rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em]"
            style={{ ...fontMono, ...tagStyle(seccion.tag) }}
          >
            {seccion.tag}
          </span>
          <h1 className="text-3xl font-semibold leading-tight sm:text-4xl" style={headingStyle}>
            {isEN ? seccion.tituloEN : seccion.titulo}
          </h1>
        </div>

        <Card
          className="theory-content-card lib-reveal rounded-2xl border p-6 sm:p-8"
          style={cardStyle}
        >
          {renderContenido(isEN)}
        </Card>
      </main>
    </div>
  );
}

function TeoriaPage() {
  const { user, loading: authLoading, rol, courseKey } = useAuth();
  const isEN = useUiLang() === "en";
  const navigate = useNavigate();
  // const { capabilities } = COURSES[courseKey];

  const [selected, setSelected] = useState<Seccion | null>(null);
  // null = sin restricción (admin/profesor); Set vacío = alumno sin grants
  const [grants, setGrants] = useState<Set<string> | null>(null);
  // Separar loading de "sin restricción" para no mostrar contenido bloqueado durante la carga
  const [cargandoGrants, setCargandoGrants] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) navigate({ to: "/login" });
  }, [user, authLoading, navigate]);

  // Cargar grants del alumno. Profesores y admins ven todo sin restricción.
  useEffect(() => {
    if (!user || !rol) return;
    if (rol === "admin" || rol === "profesor") {
      setGrants(null); // null = sin restricción
      setCargandoGrants(false);
      return;
    }
    supabase
      .from("theory_access_grants")
      .select("section_id")
      .eq("user_id", user.id)
      .then(({ data }) => {
        setGrants(new Set((data ?? []).map((g) => g.section_id as string)));
        setCargandoGrants(false);
      });
  }, [user, rol]);

  const puedeAbrir = (sectionId: string): boolean => {
    if (cargandoGrants) return false; // bloqueado mientras carga, nunca abierto por defecto
    if (grants === null) return true; // admin / profesor
    return grants.has(sectionId);
  };

  const tieneAlgunGrant = !cargandoGrants && grants !== null && grants.size > 0;

  if (authLoading || !user) {
    return (
      <div
        id="teoria-root"
        className="flex min-h-screen items-center justify-center"
        style={teoriaRootStyle}
      >
        <TeoriaScopedStyles />
        <span className="text-sm" style={{ ...fontMono, color: L.muted }}>
          {isEN ? "Loading…" : "Cargando…"}
        </span>
      </div>
    );
  }

  if (selected) {
    return <SeccionDetalle seccion={selected} onVolver={() => setSelected(null)} isEN={isEN} />;
  }

  return (
    <div id="teoria-root" className="min-h-screen" style={teoriaRootStyle}>
      <TeoriaScopedStyles />
      <SiteHeader claro />
      <main className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
        <Link
          to="/"
          className="lib-press mb-8 inline-flex items-center gap-1.5 rounded-xl text-sm font-semibold"
          style={{ color: L.primary }}
        >
          <ArrowLeft aria-hidden="true" className="h-4 w-4" />
          {isEN ? "Home" : "Inicio"}
        </Link>

        <div className="lib-reveal mb-8">
          <div
            className="mb-2 text-[10px] font-semibold uppercase tracking-[0.22em]"
            style={{ ...fontMono, color: L.primary }}
          >
            {isEN ? "Theory" : "Teoría"}
          </div>
          <h1 className="text-4xl font-semibold leading-tight sm:text-5xl" style={headingStyle}>
            {isEN ? "Literary theory sheets" : "Fichas de teoría literaria"}
          </h1>
          <p className="mt-3 max-w-2xl text-base leading-relaxed" style={{ color: L.muted }}>
            {isEN
              ? "Eight sheets with the fundamental theoretical concepts for IB English A Paper 1: literary movements, poetry, narratology, theatre, devices, vocabulary, literary theory approaches and classical topics."
              : "Ocho fichas con los conceptos teóricos fundamentales para la Prueba 1 del IB Español A: movimientos literarios, poesía, narrativa, teatro, recursos, vocabulario, enfoques de teoría literaria y tópicos clásicos."}
          </p>
        </div>

        {/* CTA si el alumno no tiene ningún grant */}
        {grants !== null && !tieneAlgunGrant && (
          <div
            className="lib-reveal mb-8 flex flex-col gap-4 rounded-2xl border p-5 sm:flex-row sm:items-center"
            style={softCardStyle}
          >
            <div className="flex-1 space-y-1">
              <div
                className="flex items-center gap-2 text-sm font-semibold"
                style={{ color: L.ink }}
              >
                <Lock aria-hidden="true" className="h-4 w-4" style={{ color: L.amberDeep }} />
                {isEN ? "Theory sheets locked" : "Fichas de teoría bloqueadas"}
              </div>
              <p className="text-sm leading-relaxed" style={{ color: L.muted }}>
                {isEN
                  ? "Book a 1:1 tutoring session and choose the area you want to work on. The corresponding sheet will unlock upon confirmation."
                  : "Reserva una sesión de tutoría 1:1 y elige el área que quieres trabajar. Al confirmarse la compra se desbloqueará la ficha correspondiente."}
              </p>
            </div>
            <Button asChild className="lib-press shrink-0 rounded-2xl" style={ctaPrimary}>
              <Link to="/reservar-sesion">{isEN ? "Book tutoring" : "Reservar tutoría"}</Link>
            </Button>
          </div>
        )}

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {SECCIONES.map((s) => {
            const abierta = puedeAbrir(s.id);
            return abierta ? (
              <button
                key={s.id}
                type="button"
                onClick={() => setSelected(s)}
                className="lib-press theory-hover-card text-left"
              >
                <Card className="theory-elevated-card flex h-full flex-col gap-3 rounded-2xl border p-5 transition-colors">
                  <span
                    className="self-start rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em]"
                    style={{ ...fontMono, ...tagStyle(s.tag) }}
                  >
                    {s.tag}
                  </span>
                  <div className="flex-1">
                    <div className="text-base font-semibold leading-snug" style={headingStyle}>
                      {isEN ? s.tituloEN : s.titulo}
                    </div>
                    <div className="mt-1.5 text-xs leading-relaxed" style={{ color: L.muted }}>
                      {isEN ? s.descripcionEN : s.descripcion}
                    </div>
                  </div>
                </Card>
              </button>
            ) : (
              <div key={s.id} className="cursor-not-allowed opacity-60">
                <Card
                  className="flex h-full flex-col gap-3 rounded-2xl border border-dashed p-5"
                  style={{ backgroundColor: L.surface, borderColor: L.line }}
                >
                  <span
                    className="self-start rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em]"
                    style={{ ...fontMono, ...tagStyle(s.tag) }}
                  >
                    {s.tag}
                  </span>
                  <div className="flex-1">
                    <div
                      className="flex items-center gap-1.5 text-base font-semibold leading-snug"
                      style={headingStyle}
                    >
                      <Lock aria-hidden="true" className="h-3.5 w-3.5 shrink-0" />
                      {isEN ? s.tituloEN : s.titulo}
                    </div>
                    <div className="mt-1.5 text-xs leading-relaxed" style={{ color: L.muted }}>
                      {isEN ? s.descripcionEN : s.descripcion}
                    </div>
                  </div>
                </Card>
              </div>
            );
          })}
        </div>
      </main>
    </div>
  );
}
