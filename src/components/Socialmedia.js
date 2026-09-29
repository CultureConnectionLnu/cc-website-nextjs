import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { library } from "@fortawesome/fontawesome-svg-core";
import {
  faInstagram,
  faDiscord,
  faWhatsapp,
  faFacebook,
} from "@fortawesome/free-brands-svg-icons";

library.add(faInstagram, faDiscord, faWhatsapp, faFacebook);

const SocialIcons = () => {
  return (
    <div className="flex items-center justify-center gap-8 p-6">
      <a
        href="https://instagram.com/cultureconnectionlnu"
        className="text-white hover:text-black transition-colors transform hover:scale-110"
        target="_blank"
        rel="noopener noreferrer"
      >
        <FontAwesomeIcon icon={["fab", "instagram"]} size="2x" />
      </a>
      <a
        href="https://discord.gg/jTSNbTneyx"
        className="text-white hover:text-black transition-colors transform hover:scale-110"
        target="_blank"
        rel="noopener noreferrer"
      >
        <FontAwesomeIcon icon={["fab", "discord"]} size="2x" />
      </a>
      <a
        href="https://chat.whatsapp.com/BQwvpZUYekY4IP0xTTgPOv"
        className="text-white hover:text-black transition-colors transform hover:scale-110"
        target="_blank"
        rel="noopener noreferrer"
      >
        <FontAwesomeIcon icon={["fab", "whatsapp"]} size="2x" />
      </a>
      <a
        href="https://www.facebook.com/groups/1380602086168241"
        className="text-white hover:text-black transition-colors transform hover:scale-110"
        target="_blank"
        rel="noopener noreferrer"
      >
        <FontAwesomeIcon icon={["fab", "facebook"]} size="2x" />
      </a>
    </div>
  );
};

export default SocialIcons;
