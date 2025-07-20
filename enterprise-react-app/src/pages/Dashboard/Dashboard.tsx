import React from 'react';
import {
  Grid,
  Paper,
  Typography,
  Box,
  Card,
  CardContent,
  CardHeader,
  IconButton,
} from '@mui/material';
import {
  TrendingUp as TrendingUpIcon,
  People as PeopleIcon,
  ShoppingCart as ShoppingCartIcon,
  AttachMoney as AttachMoneyIcon,
  MoreVert as MoreVertIcon,
} from '@mui/icons-material';
import { styled } from '@mui/material/styles';
import { useAppSelector } from '../../store/hooks';

const StatsCard = styled(Card)(({ theme }) => ({
  height: '100%',
  display: 'flex',
  flexDirection: 'column',
  transition: 'transform 0.2s ease-in-out',
  '&:hover': {
    transform: 'translateY(-4px)',
    boxShadow: theme.shadows[8],
  },
}));

const StatIcon = styled(Box)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: 48,
  height: 48,
  borderRadius: theme.shape.borderRadius,
  marginBottom: theme.spacing(2),
}));

interface StatItem {
  title: string;
  value: string;
  change: string;
  icon: React.ReactElement;
  color: string;
}

export const Dashboard: React.FC = () => {
  const user = useAppSelector((state) => state.auth.user);

  const stats: StatItem[] = [
    {
      title: 'Total Revenue',
      value: '$45,231',
      change: '+12.5%',
      icon: <AttachMoneyIcon />,
      color: '#1976d2',
    },
    {
      title: 'Total Users',
      value: '8,549',
      change: '+8.2%',
      icon: <PeopleIcon />,
      color: '#388e3c',
    },
    {
      title: 'Total Orders',
      value: '2,356',
      change: '+15.3%',
      icon: <ShoppingCartIcon />,
      color: '#f57c00',
    },
    {
      title: 'Growth Rate',
      value: '23.5%',
      change: '+4.1%',
      icon: <TrendingUpIcon />,
      color: '#7b1fa2',
    },
  ];

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Welcome back, {user?.name || 'User'}!
      </Typography>
      <Typography variant="body1" color="textSecondary" paragraph>
        Here's what's happening with your business today.
      </Typography>

      <Grid container spacing={3}>
        {/* Stats Cards */}
        {stats.map((stat, index) => (
          <Grid item xs={12} sm={6} md={3} key={index}>
            <StatsCard>
              <CardContent>
                <StatIcon sx={{ backgroundColor: `${stat.color}20` }}>
                  {React.cloneElement(stat.icon, { sx: { color: stat.color } })}
                </StatIcon>
                <Typography color="textSecondary" gutterBottom variant="body2">
                  {stat.title}
                </Typography>
                <Typography variant="h4" component="div" gutterBottom>
                  {stat.value}
                </Typography>
                <Typography variant="body2" sx={{ color: '#388e3c' }}>
                  {stat.change} from last month
                </Typography>
              </CardContent>
            </StatsCard>
          </Grid>
        ))}

        {/* Recent Activity */}
        <Grid item xs={12} md={8}>
          <Card>
            <CardHeader
              title="Recent Activity"
              action={
                <IconButton aria-label="settings">
                  <MoreVertIcon />
                </IconButton>
              }
            />
            <CardContent>
              <Typography variant="body2" color="textSecondary">
                Activity chart would go here...
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        {/* Quick Actions */}
        <Grid item xs={12} md={4}>
          <Card>
            <CardHeader
              title="Quick Actions"
              action={
                <IconButton aria-label="settings">
                  <MoreVertIcon />
                </IconButton>
              }
            />
            <CardContent>
              <Typography variant="body2" color="textSecondary">
                Quick action buttons would go here...
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};