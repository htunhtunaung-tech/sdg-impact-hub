/**
 * Reference content for the 17 Sustainable Development Goals.
 * Target wording is condensed from the official UN framework (A/RES/71/313).
 */
export interface SdgSeed {
  id: number;
  tagline: string;
  description: string;
  targets: [string, string][];
  challenges: string[];
  ways: string[];
  unSlug: string; // www.un.org/sustainabledevelopment/<slug>/
}

export const SDG_CONTENT: SdgSeed[] = [
  {
    id: 1,
    tagline: "End poverty in all its forms everywhere.",
    description:
      "Goal 1 aims to end extreme poverty, halve poverty by national definitions and build social protection systems so that people can withstand shocks such as illness, job loss and disasters. Poverty is more than a lack of income — it includes hunger, limited access to education and basic services, social exclusion and a lack of participation in decision-making.",
    targets: [
      ["1.1", "By 2030, eradicate extreme poverty for all people everywhere, currently measured as people living on less than $2.15 a day."],
      ["1.2", "By 2030, reduce at least by half the proportion of people living in poverty in all its dimensions according to national definitions."],
      ["1.3", "Implement nationally appropriate social protection systems and measures for all, including floors."],
      ["1.5", "By 2030, build the resilience of the poor and those in vulnerable situations to climate-related extreme events and other shocks."],
    ],
    challenges: [
      "Around 700 million people still live in extreme poverty, most of them in rural areas.",
      "More than half of the world's population has no social protection coverage at all.",
      "Climate shocks and conflict are pushing recently lifted households back into poverty.",
    ],
    ways: [
      "Volunteer with financial-literacy or job-readiness programmes.",
      "Support community savings groups and local social enterprises.",
      "Help families access the public benefits they are entitled to.",
      "Donate skills — accounting, legal or digital — to grassroots organisations.",
    ],
    unSlug: "poverty",
  },
  {
    id: 2,
    tagline: "End hunger, achieve food security and improved nutrition and promote sustainable agriculture.",
    description:
      "Goal 2 seeks sustainable solutions to end hunger and malnutrition by 2030, double the productivity and incomes of small-scale food producers, and ensure sustainable food production systems that maintain ecosystems and adapt to climate change.",
    targets: [
      ["2.1", "By 2030, end hunger and ensure access by all people to safe, nutritious and sufficient food all year round."],
      ["2.2", "By 2030, end all forms of malnutrition, including stunting and wasting in children under 5."],
      ["2.3", "By 2030, double the agricultural productivity and incomes of small-scale food producers."],
      ["2.4", "By 2030, ensure sustainable food production systems and resilient agricultural practices."],
    ],
    challenges: [
      "Roughly one in eleven people worldwide faces chronic hunger.",
      "About 148 million children under five are stunted.",
      "Around a third of all food produced is lost or wasted.",
    ],
    ways: [
      "Volunteer at food banks or community kitchens.",
      "Organise surplus-food redistribution from markets and restaurants.",
      "Support school and community gardens.",
      "Plan meals and store food well to cut household waste.",
    ],
    unSlug: "hunger",
  },
  {
    id: 3,
    tagline: "Ensure healthy lives and promote well-being for all at all ages.",
    description:
      "Goal 3 targets maternal and child mortality, epidemics such as HIV, tuberculosis and malaria, non-communicable diseases, mental health, road safety and universal health coverage, so that everyone can access quality health care without financial hardship.",
    targets: [
      ["3.1", "By 2030, reduce the global maternal mortality ratio to less than 70 per 100,000 live births."],
      ["3.2", "By 2030, end preventable deaths of newborns and children under 5 years of age."],
      ["3.4", "By 2030, reduce by one third premature mortality from non-communicable diseases and promote mental health and well-being."],
      ["3.8", "Achieve universal health coverage, including financial risk protection and access to quality essential health-care services."],
    ],
    challenges: [
      "At least half of the world's population lacks full coverage of essential health services.",
      "Non-communicable diseases cause around three-quarters of all deaths.",
      "Mental health services remain severely underfunded in most countries.",
    ],
    ways: [
      "Help at community health screening days.",
      "Run hygiene and nutrition sessions with schools.",
      "Train in first aid and mental-health first aid.",
      "Support blood donation drives.",
    ],
    unSlug: "health",
  },
  {
    id: 4,
    tagline: "Ensure inclusive and equitable quality education and promote lifelong learning opportunities for all.",
    description:
      "Goal 4 aims for all girls and boys to complete free, equitable and quality primary and secondary education, for access to early childhood development and affordable technical, vocational and tertiary education, and for youth and adults to gain the skills they need for decent work.",
    targets: [
      ["4.1", "By 2030, ensure that all girls and boys complete free, equitable and quality primary and secondary education."],
      ["4.4", "By 2030, substantially increase the number of youth and adults who have relevant skills, including technical and vocational skills, for employment."],
      ["4.6", "By 2030, ensure that all youth and a substantial proportion of adults achieve literacy and numeracy."],
      ["4.7", "By 2030, ensure that all learners acquire the knowledge and skills needed to promote sustainable development."],
    ],
    challenges: [
      "About 250 million children and youth are out of school.",
      "Many children in school still do not reach minimum proficiency in reading and maths.",
      "The digital divide limits access to online learning in rural areas.",
    ],
    ways: [
      "Tutor students in reading, maths or coding.",
      "Mentor young people on careers and university applications.",
      "Donate or refurbish devices for schools.",
      "Run sustainability education sessions.",
    ],
    unSlug: "education",
  },
  {
    id: 5,
    tagline: "Achieve gender equality and empower all women and girls.",
    description:
      "Goal 5 aims to end discrimination and violence against women and girls, eliminate harmful practices, recognise unpaid care work, and ensure women's full participation and equal opportunities for leadership at all levels of decision-making.",
    targets: [
      ["5.1", "End all forms of discrimination against all women and girls everywhere."],
      ["5.2", "Eliminate all forms of violence against all women and girls in the public and private spheres."],
      ["5.5", "Ensure women's full and effective participation and equal opportunities for leadership at all levels of decision-making."],
      ["5.b", "Enhance the use of enabling technology, in particular information and communications technology, to promote the empowerment of women."],
    ],
    challenges: [
      "Women hold only around a quarter of parliamentary seats worldwide.",
      "Women do around three times as much unpaid care and domestic work as men.",
      "Nearly one in three women has experienced physical or sexual violence.",
    ],
    ways: [
      "Mentor women and girls in digital and leadership skills.",
      "Support organisations that assist survivors of violence.",
      "Champion equal participation in your clubs, teams and workplaces.",
      "Run workshops on rights and financial independence.",
    ],
    unSlug: "gender-equality",
  },
  {
    id: 6,
    tagline: "Ensure availability and sustainable management of water and sanitation for all.",
    description:
      "Goal 6 goes beyond drinking water, sanitation and hygiene to address the quality and sustainability of water resources, which are critical to the survival of people and the planet.",
    targets: [
      ["6.1", "By 2030, achieve universal and equitable access to safe and affordable drinking water for all."],
      ["6.2", "By 2030, achieve access to adequate and equitable sanitation and hygiene for all and end open defecation."],
      ["6.3", "By 2030, improve water quality by reducing pollution, halving untreated wastewater and increasing recycling and safe reuse."],
      ["6.4", "By 2030, substantially increase water-use efficiency across all sectors."],
    ],
    challenges: [
      "About 2.2 billion people lack safely managed drinking water.",
      "About 3.5 billion people lack safely managed sanitation.",
      "Water stress is rising with population growth and climate change.",
    ],
    ways: [
      "Help install and maintain water filters in schools.",
      "Teach handwashing and hygiene practices.",
      "Join river and canal clean-ups.",
      "Fix leaks and reuse grey water at home.",
    ],
    unSlug: "water-and-sanitation",
  },
  {
    id: 7,
    tagline: "Ensure access to affordable, reliable, sustainable and modern energy for all.",
    description:
      "Goal 7 aims for universal access to modern energy, a substantial increase in the share of renewable energy and a doubling of the rate of improvement in energy efficiency.",
    targets: [
      ["7.1", "By 2030, ensure universal access to affordable, reliable and modern energy services."],
      ["7.2", "By 2030, increase substantially the share of renewable energy in the global energy mix."],
      ["7.3", "By 2030, double the global rate of improvement in energy efficiency."],
    ],
    challenges: [
      "Around 685 million people still live without electricity.",
      "More than two billion people cook with polluting fuels.",
      "Renewable investment is concentrated in a small number of countries.",
    ],
    ways: [
      "Support solar installations for schools and clinics.",
      "Run home energy-efficiency audits for neighbours.",
      "Promote clean cookstoves.",
      "Switch to renewable tariffs where available.",
    ],
    unSlug: "energy",
  },
  {
    id: 8,
    tagline: "Promote sustained, inclusive and sustainable economic growth, full and productive employment and decent work for all.",
    description:
      "Goal 8 promotes productive employment and decent work for all, including young people and persons with disabilities, equal pay for work of equal value, and the end of forced labour and child labour.",
    targets: [
      ["8.3", "Promote policies that support productive activities, decent job creation, entrepreneurship, creativity and innovation."],
      ["8.5", "By 2030, achieve full and productive employment and decent work for all, and equal pay for work of equal value."],
      ["8.6", "By 2020, substantially reduce the proportion of youth not in employment, education or training."],
      ["8.7", "Take immediate and effective measures to eradicate forced labour and end child labour in all its forms."],
    ],
    challenges: [
      "Around one in five young people is not in employment, education or training.",
      "About two billion workers are in informal employment without social protection.",
      "An estimated 160 million children are in child labour.",
    ],
    ways: [
      "Mentor young job seekers and review CVs.",
      "Support local social enterprises and fair-trade producers.",
      "Offer skills workshops for small business owners.",
      "Buy from businesses with fair labour practices.",
    ],
    unSlug: "economic-growth",
  },
  {
    id: 9,
    tagline: "Build resilient infrastructure, promote inclusive and sustainable industrialization and foster innovation.",
    description:
      "Goal 9 focuses on resilient infrastructure, inclusive and sustainable industrialisation, access to financial services for small enterprises, and universal and affordable access to the internet.",
    targets: [
      ["9.1", "Develop quality, reliable, sustainable and resilient infrastructure with affordable and equitable access for all."],
      ["9.3", "Increase the access of small-scale enterprises to financial services and their integration into value chains."],
      ["9.5", "Enhance scientific research and upgrade technological capabilities, encouraging innovation."],
      ["9.c", "Significantly increase access to information and communications technology and strive for universal, affordable internet access."],
    ],
    challenges: [
      "About a third of the world's population remains offline.",
      "Small enterprises often lack access to credit.",
      "Infrastructure gaps raise costs for rural communities.",
    ],
    ways: [
      "Volunteer for community tech hubs and maker spaces.",
      "Build open-source tools for non-profits.",
      "Run digital-skills sessions for small businesses.",
      "Support repair cafés and local innovation challenges.",
    ],
    unSlug: "infrastructure-industrialization",
  },
  {
    id: 10,
    tagline: "Reduce inequality within and among countries.",
    description:
      "Goal 10 calls for reducing inequalities in income as well as those based on age, sex, disability, race, ethnicity, origin, religion or economic status, and for safe, orderly migration.",
    targets: [
      ["10.1", "By 2030, progressively achieve and sustain income growth of the bottom 40 per cent of the population at a rate higher than the national average."],
      ["10.2", "By 2030, empower and promote the social, economic and political inclusion of all."],
      ["10.3", "Ensure equal opportunity and reduce inequalities of outcome, including by eliminating discriminatory laws and practices."],
      ["10.7", "Facilitate orderly, safe, regular and responsible migration and mobility of people."],
    ],
    challenges: [
      "Income inequality has grown in many countries.",
      "Persons with disabilities face barriers to education and work.",
      "Migrants and refugees often lack access to basic services.",
    ],
    ways: [
      "Support language classes for migrants and refugees.",
      "Make events and materials accessible.",
      "Volunteer with disability-inclusion organisations.",
      "Advocate for inclusive policies in your institution.",
    ],
    unSlug: "inequality",
  },
  {
    id: 11,
    tagline: "Make cities and human settlements inclusive, safe, resilient and sustainable.",
    description:
      "Goal 11 aims for adequate, safe and affordable housing, sustainable transport, inclusive urban planning, protection of cultural and natural heritage, disaster resilience and better air quality and waste management in cities.",
    targets: [
      ["11.1", "By 2030, ensure access for all to adequate, safe and affordable housing and basic services and upgrade slums."],
      ["11.2", "By 2030, provide access to safe, affordable, accessible and sustainable transport systems for all."],
      ["11.6", "By 2030, reduce the adverse per capita environmental impact of cities, including air quality and waste management."],
      ["11.7", "By 2030, provide universal access to safe, inclusive and accessible green and public spaces."],
    ],
    challenges: [
      "More than one billion people live in slums or informal settlements.",
      "Most urban residents breathe air that exceeds safe pollution levels.",
      "Rapid urbanisation outpaces planning and infrastructure.",
    ],
    ways: [
      "Help create and maintain community green spaces.",
      "Join neighbourhood disaster-preparedness groups.",
      "Map accessibility barriers in your city.",
      "Walk, cycle or use public transport.",
    ],
    unSlug: "cities",
  },
  {
    id: 12,
    tagline: "Ensure sustainable consumption and production patterns.",
    description:
      "Goal 12 is about doing more and better with less: using resources efficiently, halving food waste, managing chemicals and waste safely, and encouraging companies and people to adopt sustainable practices.",
    targets: [
      ["12.2", "By 2030, achieve the sustainable management and efficient use of natural resources."],
      ["12.3", "By 2030, halve per capita global food waste at the retail and consumer levels and reduce food losses."],
      ["12.5", "By 2030, substantially reduce waste generation through prevention, reduction, recycling and reuse."],
      ["12.8", "By 2030, ensure that people everywhere have the relevant information and awareness for sustainable lifestyles."],
    ],
    challenges: [
      "The world generates over two billion tonnes of municipal waste each year.",
      "Only a small fraction of plastic is ever recycled.",
      "Material consumption per person keeps rising.",
    ],
    ways: [
      "Organise plastic-free market or campus campaigns.",
      "Set up repair, swap and reuse events.",
      "Start composting at home or school.",
      "Sort waste correctly and support local recyclers.",
    ],
    unSlug: "sustainable-consumption-production",
  },
  {
    id: 13,
    tagline: "Take urgent action to combat climate change and its impacts.",
    description:
      "Goal 13 calls for strengthening resilience to climate-related hazards, integrating climate measures into policies and planning, and improving education and awareness on climate mitigation and adaptation.",
    targets: [
      ["13.1", "Strengthen resilience and adaptive capacity to climate-related hazards and natural disasters in all countries."],
      ["13.2", "Integrate climate change measures into national policies, strategies and planning."],
      ["13.3", "Improve education, awareness-raising and human and institutional capacity on climate change mitigation, adaptation and early warning."],
    ],
    challenges: [
      "Global temperatures are already about 1.2 °C above pre-industrial levels.",
      "Extreme heat, floods and droughts are becoming more frequent.",
      "Emissions are not yet falling fast enough to limit warming to 1.5 °C.",
    ],
    ways: [
      "Facilitate climate workshops for young people.",
      "Join tree-planting and flood-resilience projects.",
      "Measure and cut your household's energy use.",
      "Encourage your school or workplace to set climate targets.",
    ],
    unSlug: "climate-change",
  },
  {
    id: 14,
    tagline: "Conserve and sustainably use the oceans, seas and marine resources for sustainable development.",
    description:
      "Goal 14 aims to prevent and reduce marine pollution, protect marine and coastal ecosystems, minimise ocean acidification, end overfishing and conserve coastal and marine areas.",
    targets: [
      ["14.1", "By 2025, prevent and significantly reduce marine pollution of all kinds, including marine debris and nutrient pollution."],
      ["14.2", "By 2020, sustainably manage and protect marine and coastal ecosystems."],
      ["14.4", "By 2020, effectively regulate harvesting and end overfishing and illegal, unreported and unregulated fishing."],
      ["14.5", "By 2020, conserve at least 10 per cent of coastal and marine areas."],
    ],
    challenges: [
      "Millions of tonnes of plastic enter the ocean every year, much of it via rivers.",
      "More than a third of fish stocks are overfished.",
      "Coral reefs are threatened by warming and acidification.",
    ],
    ways: [
      "Join beach and riverbank clean-ups.",
      "Cut single-use plastic, especially near waterways.",
      "Choose sustainably sourced seafood.",
      "Support citizen-science water monitoring.",
    ],
    unSlug: "oceans",
  },
  {
    id: 15,
    tagline: "Protect, restore and promote sustainable use of terrestrial ecosystems and halt biodiversity loss.",
    description:
      "Goal 15 focuses on conserving and restoring forests, wetlands, drylands and mountains, combating desertification, halting biodiversity loss and protecting threatened species.",
    targets: [
      ["15.1", "Ensure the conservation, restoration and sustainable use of terrestrial and inland freshwater ecosystems."],
      ["15.2", "Promote sustainable management of all types of forests, halt deforestation and restore degraded forests."],
      ["15.3", "Combat desertification and restore degraded land and soil."],
      ["15.5", "Take urgent action to reduce the degradation of natural habitats and halt the loss of biodiversity."],
    ],
    challenges: [
      "About 10 million hectares of forest are lost every year.",
      "Over 40,000 species are threatened with extinction.",
      "Land degradation affects the livelihoods of billions of people.",
    ],
    ways: [
      "Plant native trees with local restoration groups.",
      "Remove invasive species in parks and reserves.",
      "Record wildlife sightings for citizen-science projects.",
      "Reduce paper use and choose certified wood products.",
    ],
    unSlug: "biodiversity",
  },
  {
    id: 16,
    tagline: "Promote peaceful and inclusive societies, provide access to justice for all and build effective, accountable institutions.",
    description:
      "Goal 16 aims to reduce violence, end abuse and trafficking, promote the rule of law and equal access to justice, reduce corruption and ensure responsive, inclusive and representative decision-making.",
    targets: [
      ["16.1", "Significantly reduce all forms of violence and related death rates everywhere."],
      ["16.3", "Promote the rule of law and ensure equal access to justice for all."],
      ["16.5", "Substantially reduce corruption and bribery in all their forms."],
      ["16.7", "Ensure responsive, inclusive, participatory and representative decision-making at all levels."],
    ],
    challenges: [
      "Record numbers of people have been forcibly displaced by conflict.",
      "Many people cannot get legal identity documents or access to justice.",
      "Trust in public institutions is low in many countries.",
    ],
    ways: [
      "Volunteer with legal-aid clinics.",
      "Support peer mediation and anti-bullying programmes.",
      "Encourage participation in local consultations and elections.",
      "Promote open data and transparency.",
    ],
    unSlug: "peace-justice",
  },
  {
    id: 17,
    tagline: "Strengthen the means of implementation and revitalize the Global Partnership for Sustainable Development.",
    description:
      "Goal 17 recognises that the goals can only be achieved through partnerships between governments, the private sector, civil society and individuals, built on shared principles, finance, technology, capacity building and data.",
    targets: [
      ["17.6", "Enhance cooperation on and access to science, technology and innovation and knowledge sharing."],
      ["17.9", "Enhance international support for effective and targeted capacity-building in developing countries."],
      ["17.17", "Encourage and promote effective public, public-private and civil society partnerships."],
      ["17.18", "Increase the availability of high-quality, timely and reliable disaggregated data."],
    ],
    challenges: [
      "Financing for sustainable development falls far short of what is needed.",
      "Data gaps make it hard to track progress for vulnerable groups.",
      "Partnerships are often short-lived and poorly coordinated.",
    ],
    ways: [
      "Connect organisations working on the same local challenge.",
      "Volunteer data and project-management skills to NGOs.",
      "Help organise multi-stakeholder events.",
      "Share open, well-documented impact data.",
    ],
    unSlug: "globalpartnerships",
  },
];
