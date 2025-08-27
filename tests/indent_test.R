if (!require(pacman)) {install.packages("pacman")}
pacman::p_load('skimr', 'tidyverse')

ggplot(mtcars, aes(disp, mpg)) +
  geom_point() +
  coord_radial(start = -0.4 * pi, end = 0.4 * pi, inner.radius = 0.3)

data(mtcars) %>%
  skim()




  
