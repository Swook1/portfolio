import { HTML, CSS, JavaScript, Java, MySQL, MongoDB, ReactLogo, TailwindLogo } from './skills';

export const projects = [
  {
    id: 1,
    title: 'B-Connect Platform',
    description:
      'B-Connect is a group project consisting of four people for the final project of the Software Engineering course. B-Connect is a freelancer platform designed specifically for Binus University students.',
    youtubeId: 'S6u8BeAwEKc',
    technologies: [
      { name: 'React', icon: ReactLogo },
      { name: 'Tailwind CSS', icon: TailwindLogo },
      { name: 'JavaScript', icon: JavaScript },
      { name: 'MongoDB', icon: MongoDB },
    ],
    githubUrl: 'https://github.com/Swook1/b-connect',
    websiteUrl: 'https://b-connect-nu.vercel.app/',
  },
  {
    id: 2,
    title: 'Asphatl 9: Rejends',
    description:
      'As an individual final project for the Human Centered Design (HCI) course, Apshatl 9: Rejends was created as a remake of the Asphalt 9: Legends game website.',
    youtubeId: 'MNy0GTpzTWc',
    technologies: [
      { name: 'HTML', icon: HTML },
      { name: 'CSS', icon: CSS },
      { name: 'JavaScript', icon: JavaScript },
    ],
    githubUrl: 'https://github.com/Swook1/Asphatl-9-Rejends',
    websiteUrl: 'https://swook1.github.io/Asphatl-9-Rejends/',
  },
  {
    id: 3,
    title: 'Library Management System',
    description:
      'Library Management System is a simple system for adding, displaying lists, searching, and deleting books. This Library Management System was created as one of the basic menu project exercises in Java.',
    youtubeId: 'nJ1ZtCg5Kic',
    technologies: [{ name: 'Java', icon: Java }],
    githubUrl: 'https://github.com/Swook1/Simple_Library-Management',
  },
  {
    id: 4,
    title: 'Menu Management System',
    description:
      'The Menu Management System was created as the final project of BNCC Learning and Training. This system functions as a customization menu and inventory management with a user interface (UI) and database operations.',
    youtubeId: '-FAF1OfVFQc',
    technologies: [
      { name: 'Java', icon: Java },
      { name: 'MySQL', icon: MySQL },
    ],
    githubUrl: 'https://github.com/Swook1/Menu-Management_JavaFX',
  },
];
