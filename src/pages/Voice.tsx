import { VoiceInterface } from '@/components/VoiceInterface';
import { useNavigate } from 'react-router-dom';

const Voice = () => {
  const navigate = useNavigate();

  return (
    <VoiceInterface 
      onClose={() => navigate('/')} 
    />
  );
};

export default Voice;
