import React from 'react'
import {Navigate,useLocation} from 'react-router-dom'
import {Box,CircularProgress,Alert,Button} from '@mui/material'
import {useAuth} from '../../hooks/useAuth'
export default function AuthGuard({children}) {
 const {user,business,loading,authError,refreshBusiness}=useAuth();const location=useLocation();
 if(loading)return <Box sx={{p:6,textAlign:'center'}}><CircularProgress aria-label="Loading your account"/></Box>;
 if(!user)return <Navigate to="/login" state={{from:location}} replace/>;
 if(authError)return <Alert severity="error" action={<Button onClick={()=>refreshBusiness().catch(()=>{})}>Retry</Button>}>{authError}</Alert>;
 if(location.pathname!=='/onboarding'&&(!business?.onboarding_completed_at||!business?.primary_output_unit))return <Navigate to="/onboarding" replace/>;
 return children;
}
